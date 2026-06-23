use chrono::{DateTime, Utc};
use serde::Serialize;
use serde_json::Value;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::{AppHandle, Manager};
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

/// Validates that restored/backup JSON has a structure the app can load.
/// Accepts either the legacy bare-array format (schema version 0) or the
/// current `{ version, applications: [...] }` wrapper. Anything else (a number,
/// string, or an object without an `applications` array) would corrupt the app
/// state on next load, so it is rejected before any live data is overwritten.
fn is_loadable_data_schema(value: &Value) -> bool {
  if value.is_array() {
    return true;
  }
  value
    .get("applications")
    .map_or(false, |applications| applications.is_array())
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
  let (data_file_path, _, _) = ensure_dirs(&app)?;
  if !data_file_path.exists() {
    return Ok(None);
  }

  let data = fs::read_to_string(data_file_path).map_err(|error| error.to_string())?;
  serde_json::from_str(&data).map(Some).map_err(|error| error.to_string())
}

#[tauri::command]
fn save_data(app: AppHandle, data: Value) -> Result<bool, String> {
  let (data_file_path, _, _) = ensure_dirs(&app)?;
  let temp_path = data_file_path.with_extension("json.tmp");
  let serialized = serde_json::to_string_pretty(&data).map_err(|error| error.to_string())?;
  const MAX_BYTES: usize = 50 * 1024 * 1024;
  if serialized.len() > MAX_BYTES {
    return Err("Data exceeds maximum allowed size (50 MB)".to_string());
  }
  fs::write(&temp_path, serialized).map_err(|error| error.to_string())?;
  fs::rename(&temp_path, &data_file_path).map_err(|error| error.to_string())?;

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
  let (data_file_path, _, backup_dir) = match ensure_dirs(&app) {
    Ok(paths) => paths,
    Err(error) => return backup_result_error(error),
  };

  if !data_file_path.exists() {
    return backup_result_error("No data to backup");
  }

  let timestamp = Utc::now().to_rfc3339().replace([':', '.'], "-");
  let backup_path = backup_dir.join(format!("backup-{timestamp}.json"));
  match fs::copy(&data_file_path, &backup_path) {
    Ok(_) => BackupResult {
      success: true,
      error: None,
      path: Some(path_to_string(&backup_path)),
      timestamp: Some(timestamp),
      data: None,
    },
    Err(error) => backup_result_error(error),
  }
}

#[tauri::command]
fn list_backups(app: AppHandle) -> Vec<BackupInfo> {
  let (_, _, backup_dir) = match ensure_dirs(&app) {
    Ok(paths) => paths,
    Err(_) => return Vec::new(),
  };

  let mut backups: Vec<BackupInfo> = fs::read_dir(backup_dir)
    .ok()
    .into_iter()
    .flat_map(|entries| entries.filter_map(Result::ok))
    .filter_map(|entry| {
      let path = entry.path();
      let filename = path.file_name()?.to_string_lossy().into_owned();
      if !filename.starts_with("backup-") || !filename.ends_with(".json") {
        return None;
      }

      let metadata = entry.metadata().ok()?;
      let modified = metadata.modified().ok()?;
      let timestamp = DateTime::<Utc>::from(modified).to_rfc3339();
      Some(BackupInfo {
        filename: filename.clone(),
        path: filename,
        timestamp,
        size: metadata.len(),
      })
    })
    .collect();

  backups.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
  backups
}

#[tauri::command]
fn restore_backup(app: AppHandle, filename: String) -> BackupResult {
  let (data_file_path, _, backup_dir) = match ensure_dirs(&app) {
    Ok(paths) => paths,
    Err(error) => return backup_result_error(error),
  };

  let source = backup_dir.join(&filename);
  let canonical_backup_dir = match fs::canonicalize(&backup_dir) {
    Ok(p) => p,
    Err(e) => return backup_result_error(e),
  };
  let canonical_source = match fs::canonicalize(&source) {
    Ok(p) => p,
    Err(_) => return backup_result_error("Backup file not found"),
  };
  if !canonical_source.starts_with(&canonical_backup_dir) {
    return backup_result_error("Access denied: path outside backup directory");
  }

  // Validate the backup BEFORE touching live data. Reading + parsing + a schema
  // check up front guarantees that an unparseable or structurally-broken backup
  // can never overwrite the user's current data.
  let contents = match fs::read_to_string(&canonical_source) {
    Ok(c) => c,
    Err(error) => return backup_result_error(error),
  };
  let parsed: Value = match serde_json::from_str(&contents) {
    Ok(value) => value,
    Err(_) => return backup_result_error("Backup file is not valid JSON"),
  };
  if !is_loadable_data_schema(&parsed) {
    return backup_result_error("Backup file has an unrecognized or corrupted structure");
  }

  // Snapshot the current live data so the user can recover if anything downstream
  // goes wrong.
  if data_file_path.exists() {
    let safety_path = backup_dir.join(format!("pre-restore-{}.json", Utc::now().timestamp_millis()));
    if let Err(error) = fs::copy(&data_file_path, safety_path) {
      return backup_result_error(error);
    }
  }

  // Write atomically (temp + rename) using the already-validated contents.
  let temp_path = data_file_path.with_extension("json.tmp");
  if let Err(error) = fs::write(&temp_path, &contents) {
    return backup_result_error(error);
  }
  if let Err(error) = fs::rename(&temp_path, &data_file_path) {
    let _ = fs::remove_file(&temp_path);
    return backup_result_error(error);
  }

  BackupResult {
    success: true,
    error: None,
    path: None,
    timestamp: None,
    data: Some(parsed),
  }
}

#[tauri::command]
fn delete_backup(app: AppHandle, filename: String) -> BackupResult {
  let (_, _, backup_dir) = match ensure_dirs(&app) {
    Ok(paths) => paths,
    Err(error) => return backup_result_error(error),
  };
  let path = backup_dir.join(&filename);
  let canonical_backup_dir = match fs::canonicalize(&backup_dir) {
    Ok(p) => p,
    Err(e) => return backup_result_error(e),
  };
  let canonical_path = match fs::canonicalize(&path) {
    Ok(p) => p,
    Err(_) => return backup_result_error("Backup file not found"),
  };
  if !canonical_path.starts_with(&canonical_backup_dir) {
    return backup_result_error("Access denied: path outside backup directory");
  }
  if path.exists() {
    if let Err(error) = fs::remove_file(&path) {
      return backup_result_error(error);
    }
  }
  BackupResult { success: true, error: None, path: None, timestamp: None, data: None }
}

#[tauri::command]
fn auto_backup(app: AppHandle) -> BackupResult {
  let (data_file_path, _, backup_dir) = match ensure_dirs(&app) {
    Ok(paths) => paths,
    Err(error) => return backup_result_error(error),
  };

  if !data_file_path.exists() {
    return backup_result_error("No data to backup");
  }

  let auto_backup_path = backup_dir.join("auto-backup.json");
  match fs::copy(&data_file_path, auto_backup_path) {
    Ok(_) => BackupResult {
      success: true,
      error: None,
      path: None,
      timestamp: None,
      data: None,
    },
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
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
