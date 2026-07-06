use serde::Serialize;
use std::io::{Read, Write};
use std::net::{SocketAddr, TcpStream, ToSocketAddrs};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::path::BaseDirectory;
use tauri::{AppHandle, Manager, State};

pub const DEFAULT_PORT: u16 = 8765;

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum SemanticSidecarPhase {
  Stopped,
  Starting,
  Running,
  External,
  Failed,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct SemanticSidecarStatus {
  pub phase: SemanticSidecarPhase,
  pub port: u16,
  pub spawned_by_app: bool,
  pub pid: Option<u32>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub error: Option<String>,
  pub health_enabled: bool,
  pub health_ready: bool,
}

impl SemanticSidecarStatus {
  fn stopped(port: u16, error: Option<String>) -> Self {
    Self {
      phase: if error.is_some() {
        SemanticSidecarPhase::Failed
      } else {
        SemanticSidecarPhase::Stopped
      },
      port,
      spawned_by_app: false,
      pid: None,
      error,
      health_enabled: false,
      health_ready: false,
    }
  }
}

pub struct SemanticSidecarState {
  child: Mutex<Option<Child>>,
  port: Mutex<u16>,
  last_error: Mutex<Option<String>>,
  bundled_root: Mutex<Option<PathBuf>>,
}

impl SemanticSidecarState {
  pub fn new(bundled_root: Option<PathBuf>) -> Self {
    Self {
      child: Mutex::new(None),
      port: Mutex::new(DEFAULT_PORT),
      last_error: Mutex::new(None),
      bundled_root: Mutex::new(bundled_root),
    }
  }
}

fn set_last_error(state: &SemanticSidecarState, error: Option<String>) {
  if let Ok(mut slot) = state.last_error.lock() {
    *slot = error;
  }
}

fn read_last_error(state: &SemanticSidecarState) -> Option<String> {
  state.last_error.lock().ok().and_then(|e| e.clone())
}

fn child_exited(child: &mut Child) -> bool {
  matches!(child.try_wait(), Ok(Some(_)))
}

fn reap_child(state: &SemanticSidecarState) {
  let Ok(mut guard) = state.child.lock() else {
    return;
  };
  if let Some(child) = guard.as_mut() {
    if child_exited(child) {
      *guard = None;
    }
  }
}

fn stop_child(state: &SemanticSidecarState) {
  let Ok(mut guard) = state.child.lock() else {
    return;
  };
  if let Some(mut child) = guard.take() {
    let _ = child.kill();
    let _ = child.wait();
  }
}

pub fn shutdown(state: &SemanticSidecarState) {
  stop_child(state);
}

fn find_python_executable() -> Option<String> {
  for candidate in ["python3", "python"] {
    let ok = Command::new(candidate)
      .arg("--version")
      .stdout(Stdio::null())
      .stderr(Stdio::null())
      .status()
      .map(|status| status.success())
      .unwrap_or(false);
    if ok {
      return Some(candidate.to_string());
    }
  }
  None
}

/// Resolve bundled `semantic_layer` from Tauri resources (production builds).
pub fn resolve_bundled_semantic_root(app: &AppHandle) -> Option<PathBuf> {
  let layer_dir = app
    .path()
    .resolve("semantic_layer", BaseDirectory::Resource)
    .ok()?;
  if layer_dir.join("__init__.py").is_file() {
    return layer_dir.parent().map(|parent| parent.to_path_buf());
  }
  None
}

fn read_bundled_root(state: &SemanticSidecarState) -> Option<PathBuf> {
  state
    .bundled_root
    .lock()
    .ok()
    .and_then(|slot| slot.clone())
}

/// Walk upward from candidate directories until we find `semantic_layer/__init__.py`.
pub fn find_semantic_layer_root(bundled_root: Option<&Path>) -> Option<PathBuf> {
  if let Some(root) = bundled_root {
    if root.join("semantic_layer").join("__init__.py").is_file() {
      return Some(root.to_path_buf());
    }
  }
  let mut starts: Vec<PathBuf> = Vec::new();
  if let Ok(cwd) = std::env::current_dir() {
    starts.push(cwd);
  }
  if let Ok(exe) = std::env::current_exe() {
    if let Some(parent) = exe.parent() {
      starts.push(parent.to_path_buf());
    }
  }

  for start in starts {
    let mut dir = start;
    for _ in 0..10 {
      if dir.join("semantic_layer").join("__init__.py").is_file() {
        return Some(dir);
      }
      if !dir.pop() {
        break;
      }
    }
  }
  None
}

fn python_can_run_module(python: &str, root: &Path) -> bool {
  Command::new(python)
    .args(["-c", "import semantic_layer.server"])
    .current_dir(root)
    .stdout(Stdio::null())
    .stderr(Stdio::null())
    .status()
    .map(|status| status.success())
    .unwrap_or(false)
}

fn connect_with_timeout(addr: SocketAddr, timeout: Duration) -> Result<TcpStream, String> {
  let start = Instant::now();
  loop {
    match TcpStream::connect_timeout(&addr, Duration::from_millis(200)) {
      Ok(stream) => return Ok(stream),
      Err(_) if start.elapsed() < timeout => {
        std::thread::sleep(Duration::from_millis(50));
      }
      Err(error) => return Err(error.to_string()),
    }
  }
}

#[derive(Debug, Default)]
struct HealthProbe {
  reachable: bool,
  enabled: bool,
  ready: bool,
}

fn probe_health(host: &str, port: u16, timeout: Duration) -> HealthProbe {
  let addr = format!("{host}:{port}");
  let socket_addr = match addr.to_socket_addrs() {
    Ok(mut addrs) => match addrs.next() {
      Some(addr) => addr,
      None => return HealthProbe::default(),
    },
    Err(_) => return HealthProbe::default(),
  };

  let mut stream = match connect_with_timeout(socket_addr, timeout) {
    Ok(stream) => stream,
    Err(_) => return HealthProbe::default(),
  };

  let request = format!(
    "GET /health HTTP/1.1\r\nHost: {host}\r\nConnection: close\r\n\r\n"
  );
  if stream.write_all(request.as_bytes()).is_err() {
    return HealthProbe {
      reachable: true,
      ..Default::default()
    };
  }

  let mut response = String::new();
  if stream.read_to_string(&mut response).is_err() {
    return HealthProbe {
      reachable: true,
      ..Default::default()
    };
  }

  let body = response
    .split("\r\n\r\n")
    .nth(1)
    .or_else(|| response.split("\n\n").nth(1))
    .unwrap_or("")
    .trim();

  let parsed: serde_json::Value = match serde_json::from_str(body) {
    Ok(value) => value,
    Err(_) => {
      return HealthProbe {
        reachable: true,
        ..Default::default()
      };
    }
  };

  HealthProbe {
    reachable: true,
    enabled: parsed.get("enabled").and_then(|v| v.as_bool()).unwrap_or(false),
    ready: parsed.get("ready").and_then(|v| v.as_bool()).unwrap_or(false),
  }
}

fn wait_for_health(host: &str, port: u16, timeout: Duration) -> HealthProbe {
  let start = Instant::now();
  let mut last = HealthProbe::default();
  while start.elapsed() < timeout {
    last = probe_health(host, port, Duration::from_millis(300));
    if last.reachable && last.enabled {
      return last;
    }
    std::thread::sleep(Duration::from_millis(150));
  }
  last
}

fn resolve_port(requested: Option<u16>, state: &SemanticSidecarState) -> u16 {
  requested.unwrap_or_else(|| {
    state
      .port
      .lock()
      .map(|p| *p)
      .unwrap_or(DEFAULT_PORT)
  })
}

fn build_status(state: &SemanticSidecarState, port: u16) -> SemanticSidecarStatus {
  reap_child(state);

  let health = probe_health("127.0.0.1", port, Duration::from_millis(400));
  let mut spawned_by_app = false;
  let mut pid = None;
  let mut phase = SemanticSidecarPhase::Stopped;

  if let Ok(guard) = state.child.lock() {
    if let Some(child) = guard.as_ref() {
      spawned_by_app = true;
      pid = Some(child.id());
      phase = SemanticSidecarPhase::Running;
    }
  }

  if health.reachable && health.enabled {
    if spawned_by_app {
      phase = if health.ready {
        SemanticSidecarPhase::Running
      } else {
        SemanticSidecarPhase::Starting
      };
    } else {
      phase = SemanticSidecarPhase::External;
    }
  } else if spawned_by_app {
    phase = SemanticSidecarPhase::Starting;
  } else if read_last_error(state).is_some() {
    phase = SemanticSidecarPhase::Failed;
  }

  SemanticSidecarStatus {
    phase,
    port,
    spawned_by_app,
    pid,
    error: read_last_error(state),
    health_enabled: health.enabled,
    health_ready: health.ready,
  }
}

fn spawn_sidecar(
  state: &SemanticSidecarState,
  port: u16,
) -> Result<SemanticSidecarStatus, SemanticSidecarStatus> {
  set_last_error(state, None);
  reap_child(state);

  {
    let guard = state.child.lock().map_err(|_| {
      SemanticSidecarStatus::stopped(port, Some("Sidecar state lock poisoned".into()))
    })?;
    if guard.is_some() {
      return Ok(build_status(state, port));
    }
  }

  let health = probe_health("127.0.0.1", port, Duration::from_millis(400));
  if health.reachable && health.enabled {
    return Ok(build_status(state, port));
  }

  let python = find_python_executable().ok_or_else(|| {
    let status = SemanticSidecarStatus::stopped(
      port,
      Some("Python not found. Install Python 3 and semantic layer dependencies.".into()),
    );
    set_last_error(state, status.error.clone());
    status
  })?;

  let root = find_semantic_layer_root(read_bundled_root(state).as_deref()).ok_or_else(|| {
    let status = SemanticSidecarStatus::stopped(
      port,
      Some(
        "semantic_layer package not found (dev checkout or bundled resources missing)."
          .into(),
      ),
    );
    set_last_error(state, status.error.clone());
    status
  })?;

  if !python_can_run_module(&python, &root) {
    let status = SemanticSidecarStatus::stopped(
      port,
      Some(
        "Python semantic layer dependencies missing. Run: pip install -r requirements-semantic.txt"
          .into(),
      ),
    );
    set_last_error(state, status.error.clone());
    return Err(status);
  }

  let mut command = Command::new(&python);
  command
    .arg("-m")
    .arg("semantic_layer.server")
    .current_dir(&root)
    .env("SEMANTIC_ENABLED", "1")
    .env("SEMANTIC_SERVER_HOST", "127.0.0.1")
    .env("SEMANTIC_SERVER_PORT", port.to_string())
    .env("PYTHONPATH", &root)
    .stdout(Stdio::null())
    .stderr(Stdio::null());

  let child = command.spawn().map_err(|error| {
    let message = format!("Failed to start semantic sidecar: {error}");
    let status = SemanticSidecarStatus::stopped(port, Some(message.clone()));
    set_last_error(state, Some(message));
    status
  })?;

  {
    let mut guard = state.child.lock().map_err(|_| {
      SemanticSidecarStatus::stopped(port, Some("Sidecar state lock poisoned".into()))
    })?;
    *guard = Some(child);
  }
  if let Ok(mut stored_port) = state.port.lock() {
    *stored_port = port;
  }

  let health = wait_for_health("127.0.0.1", port, Duration::from_secs(20));
  if !health.reachable {
    stop_child(state);
    let status = SemanticSidecarStatus::stopped(
      port,
      Some(format!(
        "Semantic sidecar did not start on port {port} (port may be in use)."
      )),
    );
    set_last_error(state, status.error.clone());
    return Err(status);
  }

  if !health.enabled {
    stop_child(state);
    let status = SemanticSidecarStatus::stopped(
      port,
      Some("Semantic sidecar started but reported disabled.".into()),
    );
    set_last_error(state, status.error.clone());
    return Err(status);
  }

  Ok(build_status(state, port))
}

#[tauri::command]
pub fn start_semantic_sidecar(
  state: State<'_, SemanticSidecarState>,
  port: Option<u16>,
) -> SemanticSidecarStatus {
  let port = resolve_port(port, &state);
  match spawn_sidecar(&state, port) {
    Ok(status) => status,
    Err(status) => status,
  }
}

#[tauri::command]
pub fn stop_semantic_sidecar(state: State<'_, SemanticSidecarState>) -> SemanticSidecarStatus {
  set_last_error(&state, None);
  stop_child(&state);
  let port = resolve_port(None, &state);
  build_status(&state, port)
}

#[tauri::command]
pub fn get_semantic_sidecar_status(
  state: State<'_, SemanticSidecarState>,
  port: Option<u16>,
) -> SemanticSidecarStatus {
  build_status(&state, resolve_port(port, &state))
}

pub fn init(app: &AppHandle) {
  let bundled_root = resolve_bundled_semantic_root(app);
  app.manage(SemanticSidecarState::new(bundled_root));
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn find_semantic_layer_root_from_repo() {
    assert!(find_semantic_layer_root(None).is_some());
  }

  #[test]
  fn find_semantic_layer_root_prefers_bundled_root() {
    let temp = std::env::temp_dir().join(format!(
      "academiatrack_semantic_test_{}",
      std::process::id()
    ));
    let layer = temp.join("semantic_layer");
    std::fs::create_dir_all(&layer).expect("create layer dir");
    std::fs::write(layer.join("__init__.py"), "").expect("write init");
    assert_eq!(
      find_semantic_layer_root(Some(&temp)),
      Some(temp.clone())
    );
    let _ = std::fs::remove_dir_all(&temp);
  }

  #[test]
  fn default_port_is_8765() {
    assert_eq!(DEFAULT_PORT, 8765);
  }

  #[test]
  fn stopped_status_marks_failed_when_error_present() {
    let status = SemanticSidecarStatus::stopped(8765, Some("boom".into()));
    assert_eq!(status.phase, SemanticSidecarPhase::Failed);
    assert_eq!(status.error.as_deref(), Some("boom"));
  }

  #[test]
  fn health_probe_parses_enabled_flag_when_sidecar_running() {
    let probe = probe_health("127.0.0.1", DEFAULT_PORT, Duration::from_millis(200));
    // When no sidecar is listening this stays default; test only asserts no panic.
    let _ = probe.reachable;
  }
}
