mod cli;
mod semantic_sidecar;
mod store;

pub use cli::cli_main;

use semantic_sidecar::{
  get_semantic_sidecar_status, init as init_semantic_sidecar, shutdown as shutdown_semantic_sidecar,
  start_semantic_sidecar, stop_semantic_sidecar, SemanticSidecarState,
};
use serde::Serialize;
use serde_json::Value;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::{AppHandle, Manager, RunEvent};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_notification::NotificationExt;

#[derive(Serialize)]
struct BackupInfo {
  filename: String,
  path: String,
  timestamp: String,
  size: u64,
}

#[derive(Serialize)]
struct BackupResult {
  success: bool,
  #[serde(skip_serializing_if = "Option::is_none")]
  error: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  path: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  timestamp: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  data: Option<Value>,
}

#[derive(Serialize)]
struct VersionInfo {
  version: String,
  name: String,
  node: String,
  platform: String,
  arch: String,
}

#[derive(Serialize)]
struct UpdateCheckResult {
  available: bool,
  #[serde(skip_serializing_if = "Option::is_none")]
  version: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  error: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  reason: Option<String>,
}

fn path_to_string(path: &Path) -> String {
  path.to_string_lossy().into_owned()
}

fn sanitize_path_segment(value: &str) -> String {
  value
    .chars()
    .map(|ch| match ch {
      '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
      _ => ch,
    })
    .collect()
}

fn app_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
  app.path().app_data_dir().map_err(|error| error.to_string())
}

fn open_store(app: &AppHandle) -> Result<store::Store, String> {
  store::Store::open(app_data_dir(app)?)
}

fn ensure_dirs(app: &AppHandle) -> Result<(PathBuf, PathBuf, PathBuf), String> {
  let user_data_path = app_data_dir(app)?;
  let documents_dir = user_data_path.join("documents");
  let backup_dir = user_data_path.join(".backup");

  fs::create_dir_all(&user_data_path).map_err(|error| error.to_string())?;
  fs::create_dir_all(&documents_dir).map_err(|error| error.to_string())?;
  fs::create_dir_all(&backup_dir).map_err(|error| error.to_string())?;

  Ok((user_data_path.join("data.json"), documents_dir, backup_dir))
}

fn assert_within_app_data(app: &AppHandle, path: &Path) -> Result<(), String> {
  let base = app.path().app_data_dir().map_err(|e| e.to_string())?;
  // Canonicalize BOTH sides: comparing a canonical target against a
  // non-canonical base produces false results if the base contains symlinks.
  let canonical_base = std::fs::canonicalize(&base).map_err(|e| e.to_string())?;
  let canonical = std::fs::canonicalize(path)
    .map_err(|_| "File not found".to_string())?;
  if !canonical.starts_with(&canonical_base) {
    return Err("Access denied: path outside app data".to_string());
  }
  Ok(())
}

fn backup_result_error(error: impl ToString) -> BackupResult {
  BackupResult {
    success: false,
    error: Some(error.to_string()),
    path: None,
    timestamp: None,
    data: None,
  }
}

#[tauri::command]
fn load_data(app: AppHandle) -> Result<Option<Value>, String> {
  open_store(&app)?.load_raw()
}

#[tauri::command]
fn save_data(app: AppHandle, data: Value) -> Result<bool, String> {
  open_store(&app)?.save_raw(&data)?;
  Ok(true)
}

#[tauri::command]
fn show_notification(app: AppHandle, title: String, body: String) -> Result<bool, String> {
  let title = title.chars().take(256).collect::<String>();
  let body = body.chars().take(1024).collect::<String>();
  app
    .notification()
    .builder()
    .title(title)
    .body(body)
    .show()
    .map(|_| true)
    .map_err(|e| e.to_string())
}

#[tauri::command]
async fn select_file(app: AppHandle) -> Result<Option<String>, String> {
  let selected = app
    .dialog()
    .file()
    .add_filter("Documents", &["pdf", "doc", "docx", "txt"])
    .blocking_pick_file();

  selected
    .map(|file_path| {
      file_path
        .into_path()
        .map(|path| path_to_string(&path))
        .map_err(|error| error.to_string())
    })
    .transpose()
}

#[tauri::command]
fn open_file(app: AppHandle, file_path: String) -> Result<(), String> {
  let allowed_extensions = ["pdf", "doc", "docx", "txt"];
  let path = PathBuf::from(&file_path);
  let ext = path
    .extension()
    .and_then(|e| e.to_str())
    .unwrap_or("")
    .to_lowercase();
  if !allowed_extensions.contains(&ext.as_str()) {
    return Err("File type not allowed".to_string());
  }
  let base = app_data_dir(&app)?.join("documents");
  // Canonicalize both sides so symlinks/`..` resolve consistently.
  let canonical_base = std::fs::canonicalize(&base).map_err(|e| e.to_string())?;
  let canonical = std::fs::canonicalize(&path).map_err(|_| "File not found".to_string())?;
  if !canonical.starts_with(&canonical_base) {
    return Err("Access denied: path outside documents directory".to_string());
  }

  // Hand the OS the already-validated canonical path (not the original string),
  // closing the TOCTOU window where the original path could be swapped for a
  // symlink between validation and launch. On Windows, canonicalize() yields a
  // `\\?\` verbatim path that explorer.exe mishandles, so strip that prefix.
  #[cfg(target_os = "windows")]
  let target: String = {
    let s = canonical.to_string_lossy();
    s.strip_prefix(r"\\?\").map(str::to_string).unwrap_or_else(|| s.into_owned())
  };
  #[cfg(not(target_os = "windows"))]
  let target: String = canonical.to_string_lossy().into_owned();

  #[cfg(target_os = "windows")]
  let mut command = {
    let mut command = Command::new("explorer");
    command.arg(&target);
    command
  };

  #[cfg(target_os = "macos")]
  let mut command = {
    let mut command = Command::new("open");
    command.arg(&target);
    command
  };

  #[cfg(target_os = "linux")]
  let mut command = {
    let mut command = Command::new("xdg-open");
    command.arg(&target);
    command
  };

  command.spawn().map(|_| ()).map_err(|error| error.to_string())
}

#[tauri::command]
fn copy_document(app: AppHandle, source_path: String, app_id: String, doc_type: String) -> BackupResult {
  match copy_document_impl(&app, &source_path, &app_id, &doc_type) {
    Ok(path) => BackupResult {
      success: true,
      error: None,
      path: Some(path_to_string(&path)),
      timestamp: None,
      data: None,
    },
    Err(error) => backup_result_error(error),
  }
}

fn copy_document_impl(
  app: &AppHandle,
  source_path: &str,
  app_id: &str,
  doc_type: &str,
) -> Result<PathBuf, String> {
  let (_, documents_dir, _) = ensure_dirs(app)?;

  // Validate the source before copying. Canonicalizing resolves symlinks and
  // `..` segments so a malicious/dangling path cannot read arbitrary files into
  // the documents directory, and the regular-file + extension checks enforce the
  // app's security model (no executables/scripts).
  let canonical_source =
    fs::canonicalize(source_path).map_err(|_| "Source file not found".to_string())?;
  let metadata =
    fs::metadata(&canonical_source).map_err(|_| "Cannot access source file".to_string())?;
  if !metadata.is_file() {
    return Err("Source must be a regular file".to_string());
  }
  let allowed_extensions = ["pdf", "doc", "docx", "txt"];
  let extension = canonical_source
    .extension()
    .and_then(|ext| ext.to_str())
    .unwrap_or("")
    .to_lowercase();
  if !allowed_extensions.contains(&extension.as_str()) {
    return Err("File type not permitted".to_string());
  }

  let safe_app_id = sanitize_path_segment(app_id);
  let safe_doc_type = sanitize_path_segment(doc_type);
  // Reject identifiers that sanitize to nothing: an empty app_id would collapse
  // the per-app subdirectory and let documents from different apps collide.
  if safe_app_id.is_empty() || safe_doc_type.is_empty() {
    return Err("Invalid document identifier".to_string());
  }
  let app_doc_dir = documents_dir.join(safe_app_id);
  fs::create_dir_all(&app_doc_dir).map_err(|error| error.to_string())?;

  let filename = if extension.is_empty() {
    safe_doc_type
  } else {
    format!("{safe_doc_type}.{extension}")
  };
  let destination = app_doc_dir.join(filename);

  fs::copy(&canonical_source, &destination).map_err(|error| error.to_string())?;
  Ok(destination)
}

#[tauri::command]
fn delete_document(app: AppHandle, file_path: String) -> BackupResult {
  let path = PathBuf::from(&file_path);
  if let Err(e) = assert_within_app_data(&app, &path) {
    return backup_result_error(e);
  }
  if let Err(error) = delete_document_impl(&file_path) {
    return backup_result_error(error);
  }
  BackupResult { success: true, error: None, path: None, timestamp: None, data: None }
}

fn delete_document_impl(file_path: &str) -> Result<(), String> {
  let path = PathBuf::from(file_path);
  if path.exists() {
    fs::remove_file(path).map_err(|error| error.to_string())?;
  }
  Ok(())
}

#[tauri::command]
fn create_backup(app: AppHandle) -> BackupResult {
  let store = match open_store(&app) {
    Ok(store) => store,
    Err(error) => return backup_result_error(error),
  };
  match store.create_backup() {
    Ok((path, timestamp)) => BackupResult {
      success: true,
      error: None,
      path: Some(path_to_string(&path)),
      timestamp: Some(timestamp),
      data: None,
    },
    Err(error) => backup_result_error(error),
  }
}

#[tauri::command]
fn list_backups(app: AppHandle) -> Vec<BackupInfo> {
  let store = match open_store(&app) {
    Ok(store) => store,
    Err(_) => return Vec::new(),
  };
  let entries = match store.list_backups() {
    Ok(entries) => entries,
    Err(_) => return Vec::new(),
  };
  let mut backups: Vec<BackupInfo> = entries
    .into_iter()
    .map(|entry| BackupInfo {
      path: entry.filename.clone(),
      filename: entry.filename,
      timestamp: entry.timestamp,
      size: entry.size,
    })
    .collect();
  backups.sort_by(|left, right| right.timestamp.cmp(&left.timestamp));
  backups
}

#[tauri::command]
fn restore_backup(app: AppHandle, filename: String) -> BackupResult {
  let store = match open_store(&app) {
    Ok(store) => store,
    Err(error) => return backup_result_error(error),
  };
  match store.restore_backup(&filename) {
    Ok(data) => BackupResult {
      success: true,
      error: None,
      path: None,
      timestamp: None,
      data: Some(data),
    },
    Err(error) => backup_result_error(error),
  }
}

#[tauri::command]
fn delete_backup(app: AppHandle, filename: String) -> BackupResult {
  let store = match open_store(&app) {
    Ok(store) => store,
    Err(error) => return backup_result_error(error),
  };
  match store.delete_backup(&filename) {
    Ok(()) => BackupResult { success: true, error: None, path: None, timestamp: None, data: None },
    Err(error) => backup_result_error(error),
  }
}

#[tauri::command]
fn auto_backup(app: AppHandle) -> BackupResult {
  let store = match open_store(&app) {
    Ok(store) => store,
    Err(error) => return backup_result_error(error),
  };
  match store.auto_backup() {
    Ok(()) => BackupResult { success: true, error: None, path: None, timestamp: None, data: None },
    Err(error) => backup_result_error(error),
  }
}

#[tauri::command]
fn get_version_info(app: AppHandle) -> VersionInfo {
  VersionInfo {
    version: app.package_info().version.to_string(),
    name: "AcademiaTrack".to_string(),
    node: "Tauri".to_string(),
    platform: std::env::consts::OS.to_string(),
    arch: std::env::consts::ARCH.to_string(),
  }
}

#[tauri::command]
fn check_for_updates() -> UpdateCheckResult {
  UpdateCheckResult {
    available: false,
    version: None,
    error: None,
    reason: Some("Tauri updater is not configured for this build".to_string()),
  }
}

#[tauri::command]
fn download_update() -> BackupResult {
  backup_result_error("Tauri updater is not configured for this build")
}

#[tauri::command]
fn install_update() -> BackupResult {
  backup_result_error("Tauri updater is not configured for this build")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_notification::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      init_semantic_sidecar(app.handle());
      match app.path().app_data_dir() {
        Ok(dir) => match store::Store::open(dir) {
          Ok(store) => {
            if let Err(error) = store.acquire_desktop_session() {
              eprintln!("AcademiaTrack could not write desktop.lock: {error}");
            }
          }
          Err(error) => eprintln!("AcademiaTrack could not open its data directory: {error}"),
        },
        Err(error) => eprintln!("AcademiaTrack could not resolve its data directory: {error}"),
      }

      // The window is created hidden (`"visible": false`) so we can finish
      // styling it before the first paint, avoiding a flash of the wrong frame.
      //
      // macOS keeps native decorations with a transparent title bar
      // (`titleBarStyle: "Transparent"` + `hiddenTitle`), so the native traffic
      // lights render inset over our custom title bar. Windows and Linux get a
      // borderless window driven by the in-app window controls instead.
      let window = app
        .get_webview_window("main")
        .expect("main window is defined in tauri.conf.json");
      #[cfg(not(target_os = "macos"))]
      window.set_decorations(false)?;
      window.show()?;

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      load_data,
      save_data,
      show_notification,
      select_file,
      open_file,
      copy_document,
      delete_document,
      create_backup,
      list_backups,
      restore_backup,
      delete_backup,
      auto_backup,
      get_version_info,
      check_for_updates,
      download_update,
      install_update,
      start_semantic_sidecar,
      stop_semantic_sidecar,
      get_semantic_sidecar_status,
    ])
    .build(tauri::generate_context!())
    .expect("error while building tauri application")
    .run(|app_handle, event| {
      if let RunEvent::Exit = event {
        if let Some(state) = app_handle.try_state::<SemanticSidecarState>() {
          shutdown_semantic_sidecar(&state);
        }
        if let Ok(dir) = app_handle.path().app_data_dir() {
          if let Ok(store) = store::Store::open(dir) {
            store.release_desktop_session();
          }
        }
      }
    });
}
