//! Desktop data store shared by the Tauri shell and the `academiatrack` CLI.
//!
//! The native document is `data.json` in the app data directory
//! (`com.bharathvbcr.academiatrack`). Writes are atomic (temp file plus rename),
//! capped at 50 MB, and serialized with an exclusive lock. The CLI refuses to
//! write while the desktop process holds `desktop.lock`, because the open window
//! keeps applications in memory and would overwrite a CLI edit on its next save.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};
use std::fs::{self, OpenOptions};
use std::io::{ErrorKind, Write};
use std::path::{Path, PathBuf};
use std::process::Command;
use std::thread;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

/// Must match `CURRENT_DATA_VERSION` in `utils/dataMigration.ts`.
pub const CURRENT_DATA_VERSION: u64 = 3;
pub const MAX_BYTES: usize = 50 * 1024 * 1024;
pub const BUNDLE_ID: &str = "com.bharathvbcr.academiatrack";

const WRITE_LOCK: &str = "data.json.lock";
const DESKTOP_LOCK: &str = "desktop.lock";
const HISTORY_FILE: &str = ".cli-history.json";
const LOCK_WAIT: Duration = Duration::from_secs(2);
const LOCK_STALE: Duration = Duration::from_secs(60);
const HISTORY_LIMIT: usize = 20;

const TERMINAL_STATUSES: &[&str] = &[
  "Accepted",
  "Rejected",
  "Withdrawn",
  "Skipping",
  "Attending",
];

const CANONICAL_STATUSES: &[(&str, &str)] = &[
  ("not started", "Not Started"),
  ("not-started", "Not Started"),
  ("not_started", "Not Started"),
  ("pursuing", "Pursuing"),
  ("in progress", "In Progress"),
  ("in-progress", "In Progress"),
  ("in_progress", "In Progress"),
  ("submitted", "Submitted"),
  ("interview", "Interview"),
  ("accepted", "Accepted"),
  ("rejected", "Rejected"),
  ("waitlisted", "Waitlisted"),
  ("withdrawn", "Withdrawn"),
  ("skipping", "Skipping"),
  ("attending", "Attending"),
];

const CANONICAL_PROGRAM_TYPES: &[(&str, &str)] = &[
  ("phd", "PhD"),
  ("master's", "Master's"),
  ("masters", "Master's"),
  ("master", "Master's"),
  ("bachelor's", "Bachelor's"),
  ("bachelors", "Bachelor's"),
  ("bachelor", "Bachelor's"),
  ("postdoc", "Postdoc"),
  ("other", "Other"),
];

const CANONICAL_FEE_WAIVERS: &[(&str, &str)] = &[
  ("not requested", "Not Requested"),
  ("not-requested", "Not Requested"),
  ("not_requested", "Not Requested"),
  ("requested", "Requested"),
  ("granted", "Granted"),
  ("denied", "Denied"),
];

const CANONICAL_DOCUMENT_STATUSES: &[(&str, &str)] = &[
  ("not started", "Not Started"),
  ("not-started", "Not Started"),
  ("not_started", "Not Started"),
  ("drafting", "Drafting"),
  ("reviewing", "Reviewing"),
  ("ready to submit", "Ready to Submit"),
  ("ready-to-submit", "Ready to Submit"),
  ("ready_to_submit", "Ready to Submit"),
  ("submitted", "Submitted"),
];

const DOCUMENT_SLOTS: &[(&str, bool)] = &[
  ("cv", true),
  ("statementOfPurpose", true),
  ("transcripts", true),
  ("lor1", false),
  ("lor2", false),
  ("lor3", false),
  ("writingSample", false),
];

pub struct Store {
  root: PathBuf,
}

#[derive(Clone, Debug)]
pub struct BackupEntry {
  pub filename: String,
  pub timestamp: String,
  pub size: u64,
}

#[derive(Clone, Debug)]
pub struct NewApplication {
  pub id: Option<String>,
  pub university: String,
  pub program: String,
  pub program_type: Option<String>,
  pub department: Option<String>,
  pub location: Option<String>,
  pub status: Option<String>,
  pub deadline: Option<String>,
  pub portal: Option<String>,
  pub notes: Option<String>,
  pub fee: Option<f64>,
  pub term: Option<String>,
  pub year: Option<String>,
  pub tags: Vec<String>,
}

#[derive(Clone, Debug)]
pub enum FieldChange<T> {
  Unchanged,
  Set(T),
  Clear,
}

#[derive(Clone, Debug)]
pub struct ApplicationPatch {
  pub university: Option<String>,
  pub program: Option<String>,
  pub program_type: Option<String>,
  pub department: Option<String>,
  pub location: Option<String>,
  pub status: Option<String>,
  pub deadline: FieldChange<String>,
  pub portal: Option<String>,
  pub notes: Option<String>,
  pub fee: Option<f64>,
  pub term: FieldChange<String>,
  pub year: FieldChange<String>,
  pub pinned: Option<bool>,
  pub add_tags: Vec<String>,
  pub remove_tags: Vec<String>,
  pub fee_waiver: Option<String>,
  pub decision_deadline: FieldChange<String>,
  pub chance: FieldChange<f64>,
  pub document: Option<String>,
  pub document_status: Option<String>,
  pub document_required: Option<bool>,
}

impl Default for ApplicationPatch {
  fn default() -> Self {
    Self {
      university: None,
      program: None,
      program_type: None,
      department: None,
      location: None,
      status: None,
      deadline: FieldChange::Unchanged,
      portal: None,
      notes: None,
      fee: None,
      term: FieldChange::Unchanged,
      year: FieldChange::Unchanged,
      pinned: None,
      add_tags: Vec::new(),
      remove_tags: Vec::new(),
      fee_waiver: None,
      decision_deadline: FieldChange::Unchanged,
      chance: FieldChange::Unchanged,
      document: None,
      document_status: None,
      document_required: None,
    }
  }
}

#[derive(Serialize, Deserialize, Default)]
struct History {
  undo: Vec<HistoryEntry>,
  redo: Vec<HistoryEntry>,
}

#[derive(Serialize, Deserialize)]
struct HistoryEntry {
  restore: Option<String>,
  expect_fp: String,
}

pub fn default_data_dir() -> Result<PathBuf, String> {
  if let Some(dir) = std::env::var_os("ACADEMIATRACK_DATA_DIR") {
    if !dir.is_empty() {
      return Ok(PathBuf::from(dir));
    }
  }
  #[cfg(target_os = "macos")]
  {
    return Ok(home_dir()?.join("Library/Application Support").join(BUNDLE_ID));
  }
  #[cfg(target_os = "linux")]
  {
    if let Some(xdg) = std::env::var_os("XDG_DATA_HOME") {
      if !xdg.is_empty() {
        return Ok(PathBuf::from(xdg).join(BUNDLE_ID));
      }
    }
    return Ok(home_dir()?.join(".local/share").join(BUNDLE_ID));
  }
  #[cfg(target_os = "windows")]
  {
    let appdata = std::env::var_os("APPDATA").ok_or_else(|| "APPDATA is not set; pass --data-dir".to_string())?;
    return Ok(PathBuf::from(appdata).join(BUNDLE_ID));
  }
  #[cfg(not(any(target_os = "macos", target_os = "linux", target_os = "windows")))]
  {
    Err("unsupported operating system; pass --data-dir".to_string())
  }
}

#[cfg(any(target_os = "macos", target_os = "linux"))]
fn home_dir() -> Result<PathBuf, String> {
  std::env::var_os("HOME")
    .filter(|value| !value.is_empty())
    .map(PathBuf::from)
    .ok_or_else(|| "HOME is not set; pass --data-dir".to_string())
}

impl Store {
  pub fn open(root: impl Into<PathBuf>) -> Result<Self, String> {
    let root = root.into();
    if root.as_os_str().is_empty() {
      return Err("data dir is empty".to_string());
    }
    fs::create_dir_all(&root).map_err(|error| error.to_string())?;
    fs::create_dir_all(root.join("documents")).map_err(|error| error.to_string())?;
    fs::create_dir_all(root.join(".backup")).map_err(|error| error.to_string())?;
    Ok(Self { root })
  }

  pub fn root(&self) -> &Path {
    &self.root
  }

  pub fn data_path(&self) -> PathBuf {
    self.root.join("data.json")
  }

  pub fn load_raw(&self) -> Result<Option<Value>, String> {
    match self.read_bytes()? {
      None => Ok(None),
      Some(bytes) => parse_json_bytes(&bytes).map(Some),
    }
  }

  pub fn save_raw(&self, data: &Value) -> Result<(), String> {
    let bytes = serialize_document(data)?;
    self.with_write_lock(LOCK_WAIT, || self.write_bytes_unlocked(&bytes))
  }

  pub fn acquire_desktop_session(&self) -> Result<(), String> {
    let path = self.root.join(DESKTOP_LOCK);
    if path.exists() {
      match read_lock_pid(&path) {
        Ok(pid) if process_alive(pid) && pid != std::process::id() => return Ok(()),
        _ => {
          let _ = fs::remove_file(&path);
        }
      }
    }
    let mut file = OpenOptions::new()
      .write(true)
      .create_new(true)
      .open(&path)
      .map_err(|error| error.to_string())?;
    writeln!(file, "{}", std::process::id()).map_err(|error| error.to_string())?;
    Ok(())
  }

  pub fn release_desktop_session(&self) {
    let path = self.root.join(DESKTOP_LOCK);
    if read_lock_pid(&path).ok() == Some(std::process::id()) {
      let _ = fs::remove_file(path);
    }
  }

  pub fn status(&self) -> Result<Value, String> {
    let path = self.data_path();
    let bytes = self.read_bytes()?;
    let (version, applications, last_updated, readable_error) = match &bytes {
      None => (CURRENT_DATA_VERSION, 0, Value::Null, None),
      Some(raw) => match readable_document(raw) {
        Ok(doc) => (
          doc.get("version").and_then(|value| value.as_u64()).unwrap_or(0),
          doc.get("applications").and_then(|value| value.as_array()).map(|apps| apps.len()).unwrap_or(0),
          doc.get("lastUpdated").cloned().unwrap_or(Value::Null),
          None,
        ),
        Err(error) => (0, 0, Value::Null, Some(error)),
      },
    };
    let write_block = self.desktop_write_block();
    Ok(json!({
      "data_dir": self.root().to_string_lossy(),
      "data_file": path.to_string_lossy(),
      "exists": bytes.is_some(),
      "version": version,
      "writer_version": CURRENT_DATA_VERSION,
      "applications": applications,
      "last_updated": last_updated,
      "desktop_running": write_block.is_some(),
      "writable": write_block.is_none() && readable_error.is_none(),
      "write_block": write_block,
      "read_error": readable_error,
      "note": "The CLI writes the desktop data.json store. Browser localStorage (phd-applications) is a separate store. Close AcademiaTrack before writing; an open window keeps a copy in memory.",
    }))
  }

  pub fn list_applications(&self, status: Option<&str>, limit: Option<usize>) -> Result<Value, String> {
    let doc = self.read_document()?;
    let wanted = match status {
      Some(status) => Some(canonical_status(status)?),
      None => None,
    };
    let mut applications = Vec::new();
    for app in applications_of(&doc)? {
      if let Some(wanted) = &wanted {
        if app.get("status").and_then(|value| value.as_str()) != Some(wanted.as_str()) {
          continue;
        }
      }
      applications.push(app.clone());
    }
    if let Some(limit) = limit {
      applications.truncate(limit);
    }
    let count = applications.len();
    Ok(json!({ "count": count, "applications": applications }))
  }

  pub fn get_application(&self, id: &str) -> Result<Value, String> {
    let doc = self.read_document()?;
    let matches: Vec<&Value> = applications_of(&doc)?
      .iter()
      .filter(|app| app.get("id").and_then(|value| value.as_str()) == Some(id))
      .collect();
    match matches.len() {
      0 => Err(format!("no application with id {id}")),
      1 => Ok(matches[0].clone()),
      _ => Err(format!("more than one application has id {id}")),
    }
  }

  pub fn add_application(&self, spec: NewApplication) -> Result<Value, String> {
    let university = require_text("university", &spec.university, 500)?;
    let program = require_text("program", &spec.program, 500)?;
    let application = new_application_value(&spec, &university, &program)?;
    let id = application["id"].as_str().unwrap_or_default().to_string();
    self.commit_document(move |doc| {
      let apps = applications_mut(doc)?;
      if apps.iter().any(|app| app.get("id").and_then(|value| value.as_str()) == Some(id.as_str())) {
        return Err(format!("an application with id {id} already exists"));
      }
      apps.push(application.clone());
      Ok(application)
    })
  }

  pub fn update_application(&self, id: &str, patch: ApplicationPatch) -> Result<Value, String> {
    let id = id.to_string();
    self.commit_document(move |doc| {
      let apps = applications_mut(doc)?;
      let indexes: Vec<usize> = apps
        .iter()
        .enumerate()
        .filter(|(_, app)| app.get("id").and_then(|value| value.as_str()) == Some(id.as_str()))
        .map(|(index, _)| index)
        .collect();
      match indexes.len() {
        0 => return Err(format!("no application with id {id}")),
        1 => {}
        _ => return Err(format!("more than one application has id {id}")),
      }
      apply_patch(&mut apps[indexes[0]], &patch)?;
      Ok(apps[indexes[0]].clone())
    })
  }

  pub fn delete_application(&self, id: &str) -> Result<Value, String> {
    let id = id.to_string();
    self.commit_document(move |doc| {
      let apps = applications_mut(doc)?;
      let before = apps.len();
      apps.retain(|app| app.get("id").and_then(|value| value.as_str()) != Some(id.as_str()));
      Ok(json!({ "id": id, "deleted": before - apps.len() }))
    })
  }

  pub fn search_applications(&self, query: &str) -> Result<Value, String> {
    let query = query.trim();
    if query.is_empty() {
      return Err("search query is empty".to_string());
    }
    let needle = query.to_lowercase();
    let doc = self.read_document()?;
    let mut applications = Vec::new();
    for app in applications_of(&doc)? {
      if application_haystack(app).to_lowercase().contains(&needle) {
        applications.push(app.clone());
      }
    }
    let count = applications.len();
    Ok(json!({ "query": query, "count": count, "applications": applications }))
  }

  pub fn upcoming_deadlines(&self, days: i64) -> Result<Value, String> {
    if !(0..=3660).contains(&days) {
      return Err("days must be between 0 and 3660".to_string());
    }
    self.deadlines(|distance| distance >= 0 && distance <= days, days)
  }

  pub fn overdue_deadlines(&self) -> Result<Value, String> {
    self.deadlines(|distance| distance < 0, 0)
  }

  pub fn export_document(&self) -> Result<Value, String> {
    self.read_document()
  }

  pub fn export_csv(&self) -> Result<String, String> {
    let doc = self.read_document()?;
    let mut csv = String::from("id,universityName,programName,programType,department,location,status,deadline,preferredDeadline,admissionTerm,admissionYear,applicationFee,portalLink,notes\n");
    for app in applications_of(&doc)? {
      let cells = [
        text_field(app, "id"),
        text_field(app, "universityName"),
        text_field(app, "programName"),
        text_field(app, "programType"),
        text_field(app, "department"),
        text_field(app, "location"),
        text_field(app, "status"),
        text_field(app, "deadline"),
        text_field(app, "preferredDeadline"),
        text_field(app, "admissionTerm"),
        text_field(app, "admissionYear"),
        text_field(app, "applicationFee"),
        text_field(app, "portalLink"),
        text_field(app, "notes"),
      ];
      let rendered = cells.iter().map(|cell| csv_cell(cell)).collect::<Vec<_>>().join(",");
      csv.push_str(&rendered);
      csv.push('\n');
    }
    Ok(csv)
  }

  pub fn import_applications(&self, incoming: Vec<Value>, merge: bool) -> Result<Value, String> {
    let normalized = normalize_import(incoming)?;
    let imported = normalized.len();
    self.commit_document(move |doc| {
      let apps = applications_mut(doc)?;
      if merge {
        for app in &normalized {
          let id = app.get("id").and_then(|value| value.as_str()).unwrap_or("");
          if apps.iter().any(|existing| existing.get("id").and_then(|value| value.as_str()) == Some(id)) {
            return Err(format!("an application with id {id} already exists"));
          }
        }
      }
      let kept = if merge { apps.len() } else { 0 };
      if !merge {
        apps.clear();
      }
      apps.extend(normalized.iter().cloned());
      Ok(json!({
        "imported": imported,
        "merge": merge,
        "total": kept + imported,
      }))
    })
  }

  pub fn undo(&self) -> Result<Value, String> {
    self.apply_history(true)
  }

  pub fn redo(&self) -> Result<Value, String> {
    self.apply_history(false)
  }

  pub fn create_backup(&self) -> Result<(PathBuf, String), String> {
    self.with_write_lock(LOCK_WAIT, || {
      let data_path = self.data_path();
      if !data_path.exists() {
        return Err("No data to backup".to_string());
      }
      let timestamp = Utc::now().to_rfc3339().replace([':', '.'], "-");
      let backup_path = self.root.join(".backup").join(format!("backup-{timestamp}.json"));
      fs::copy(&data_path, &backup_path).map_err(|error| error.to_string())?;
      Ok((backup_path, timestamp))
    })
  }

  pub fn list_backups(&self) -> Result<Vec<BackupEntry>, String> {
    let backup_dir = self.root.join(".backup");
    let mut backups = Vec::new();
    let entries = match fs::read_dir(&backup_dir) {
      Ok(entries) => entries,
      Err(_) => return Ok(backups),
    };
    for entry in entries.filter_map(Result::ok) {
      let path = entry.path();
      let filename = path.file_name().map(|name| name.to_string_lossy().into_owned()).unwrap_or_default();
      if !filename.starts_with("backup-") || !filename.ends_with(".json") {
        continue;
      }
      let metadata = entry.metadata().map_err(|error| error.to_string())?;
      let modified = metadata.modified().map_err(|error| error.to_string())?;
      backups.push(BackupEntry {
        filename,
        timestamp: DateTime::<Utc>::from(modified).to_rfc3339(),
        size: metadata.len(),
      });
    }
    backups.sort_by(|left, right| right.timestamp.cmp(&left.timestamp));
    Ok(backups)
  }

  pub fn restore_backup(&self, filename: &str) -> Result<Value, String> {
    self.with_write_lock(LOCK_WAIT, || self.restore_backup_unlocked(filename))
  }

  pub fn restore_backup_with_undo(&self, filename: &str) -> Result<Value, String> {
    let filename = filename.to_string();
    self.with_write_lock(LOCK_WAIT, || {
      self.ensure_desktop_idle()?;
      let before = self.read_bytes()?;
      let parsed = self.restore_backup_unlocked(&filename)?;
      let after = self.read_bytes()?.ok_or_else(|| "restore did not write data.json".to_string())?;
      if let Err(error) = self.push_history_unlocked(before, &after) {
        eprintln!("warning: data was saved, but undo history was not recorded: {error}");
      }
      Ok(parsed)
    })
  }

  pub fn delete_backup(&self, filename: &str) -> Result<(), String> {
    let filename = filename.to_string();
    self.with_write_lock(LOCK_WAIT, || {
      let path = self.checked_backup_path(&filename)?;
      if path.exists() {
        fs::remove_file(&path).map_err(|error| error.to_string())?;
      }
      Ok(())
    })
  }

  pub fn auto_backup(&self) -> Result<(), String> {
    self.with_write_lock(LOCK_WAIT, || {
      let data_path = self.data_path();
      if !data_path.exists() {
        return Err("No data to backup".to_string());
      }
      let destination = self.root.join(".backup").join("auto-backup.json");
      fs::copy(&data_path, destination).map(|_| ()).map_err(|error| error.to_string())
    })
  }

  fn deadlines<F>(&self, keep: F, within_days: i64) -> Result<Value, String>
  where
    F: Fn(i64) -> bool,
  {
    let doc = self.read_document()?;
    let today = chrono::Local::now().date_naive();
    let mut rows = Vec::new();
    for app in applications_of(&doc)? {
      let status = app.get("status").and_then(|value| value.as_str()).unwrap_or("");
      if TERMINAL_STATUSES.contains(&status) {
        continue;
      }
      let Some(deadline) = app.get("deadline").and_then(|value| value.as_str()) else {
        continue;
      };
      let Ok(date) = chrono::NaiveDate::parse_from_str(deadline, "%Y-%m-%d") else {
        continue;
      };
      let distance = (date - today).num_days();
      if !keep(distance) {
        continue;
      }
      rows.push(json!({
        "id": app.get("id").cloned().unwrap_or(Value::Null),
        "universityName": app.get("universityName").cloned().unwrap_or(Value::Null),
        "programName": app.get("programName").cloned().unwrap_or(Value::Null),
        "status": status,
        "deadline": deadline,
        "days": distance,
      }));
    }
    rows.sort_by_key(|row| row.get("days").and_then(|value| value.as_i64()).unwrap_or(0));
    let count = rows.len();
    Ok(json!({ "within_days": within_days, "count": count, "deadlines": rows }))
  }

  fn commit_document<F>(&self, mutate: F) -> Result<Value, String>
  where
    F: FnOnce(&mut Value) -> Result<Value, String>,
  {
    self.with_write_lock(LOCK_WAIT, || {
      self.ensure_desktop_idle()?;
      let before = self.read_bytes()?;
      let mut doc = match &before {
        None => empty_document(),
        Some(bytes) => writable_document(bytes)?,
      };
      ensure_all_applications(&mut doc)?;
      let result = mutate(&mut doc)?;
      ensure_all_applications(&mut doc)?;
      touch_document(&mut doc);
      let after = serialize_document(&doc)?;
      self.write_bytes_unlocked(&after)?;
      if let Err(error) = self.push_history_unlocked(before, &after) {
        eprintln!("warning: data was saved, but undo history was not recorded: {error}");
      }
      Ok(result)
    })
  }

  fn read_document(&self) -> Result<Value, String> {
    match self.read_bytes()? {
      None => Ok(empty_document()),
      Some(bytes) => readable_document(&bytes),
    }
  }

  fn apply_history(&self, undo: bool) -> Result<Value, String> {
    self.with_write_lock(LOCK_WAIT, || {
      self.ensure_desktop_idle()?;
      let mut history = self.load_history_unlocked()?;
      let source = if undo { &mut history.undo } else { &mut history.redo };
      let entry = source.pop().ok_or_else(|| {
        if undo {
          "nothing to undo".to_string()
        } else {
          "nothing to redo".to_string()
        }
      })?;
      let current = self.read_bytes()?;
      if fingerprint(current.as_deref()) != entry.expect_fp {
        source.push(entry);
        self.store_history_unlocked(&history)?;
        return Err(
          "data.json changed after the CLI command this would reverse. The command was refused so the newer contents stay put."
            .to_string(),
        );
      }
      match &entry.restore {
        Some(text) => self.write_bytes_unlocked(text.as_bytes())?,
        None => {
          let path = self.data_path();
          if path.exists() {
            fs::remove_file(&path).map_err(|error| error.to_string())?;
          }
        }
      }
      let restored = self.read_bytes()?;
      let inverse = HistoryEntry {
        restore: current.map(|bytes| String::from_utf8_lossy(&bytes).into_owned()),
        expect_fp: fingerprint(restored.as_deref()),
      };
      if undo {
        history.redo.push(inverse);
      } else {
        history.undo.push(inverse);
        trim_history(&mut history.undo);
      }
      self.store_history_unlocked(&history)?;
      let doc = self.read_document().unwrap_or_else(|_| empty_document());
      let count = doc.get("applications").and_then(|value| value.as_array()).map(|apps| apps.len()).unwrap_or(0);
      Ok(json!({
        "action": if undo { "undo" } else { "redo" },
        "applications": count,
      }))
    })
  }

  fn restore_backup_unlocked(&self, filename: &str) -> Result<Value, String> {
    let source = self.checked_backup_path(filename)?;
    let contents = fs::read_to_string(&source).map_err(|_| "Backup file not found".to_string())?;
    let parsed: Value = serde_json::from_str(&contents).map_err(|_| "Backup file is not valid JSON".to_string())?;
    if !is_loadable_data_schema(&parsed) {
      return Err("Backup file has an unrecognized or corrupted structure".to_string());
    }
    let data_path = self.data_path();
    if data_path.exists() {
      let safety = self.root.join(".backup").join(format!("pre-restore-{}.json", Utc::now().timestamp_millis()));
      fs::copy(&data_path, safety).map_err(|error| error.to_string())?;
    }
    if contents.len() > MAX_BYTES {
      return Err("Data exceeds maximum allowed size (50 MB)".to_string());
    }
    self.write_bytes_unlocked(contents.as_bytes())?;
    Ok(parsed)
  }

  fn checked_backup_path(&self, filename: &str) -> Result<PathBuf, String> {
    if filename.is_empty() || filename.contains(['/', '\\']) || filename.contains("..") {
      return Err("Access denied: path outside backup directory".to_string());
    }
    let backup_dir = self.root.join(".backup");
    let source = backup_dir.join(filename);
    let canonical_backup_dir = fs::canonicalize(&backup_dir).map_err(|error| error.to_string())?;
    let canonical_source = fs::canonicalize(&source).map_err(|_| "Backup file not found".to_string())?;
    if !canonical_source.starts_with(&canonical_backup_dir) {
      return Err("Access denied: path outside backup directory".to_string());
    }
    Ok(canonical_source)
  }

  fn ensure_desktop_idle(&self) -> Result<(), String> {
    match self.desktop_write_block() {
      Some(message) => Err(message),
      None => Ok(()),
    }
  }

  fn desktop_write_block(&self) -> Option<String> {
    let path = self.root.join(DESKTOP_LOCK);
    if !path.exists() {
      return None;
    }
    match read_lock_pid(&path) {
      Ok(pid) if pid == std::process::id() => None,
      Ok(pid) if process_alive(pid) => Some(format!(
        "AcademiaTrack desktop is running (pid {pid}) and keeps applications in memory. Close it before writing, or the next edit in the window will overwrite this change."
      )),
      Ok(_) => {
        let _ = fs::remove_file(&path);
        None
      }
      Err(_) => Some(format!(
        "desktop.lock at {} is unreadable. Delete it if AcademiaTrack is not running.",
        path.display()
      )),
    }
  }

  fn push_history_unlocked(&self, before: Option<Vec<u8>>, after: &[u8]) -> Result<(), String> {
    if before.as_deref() == Some(after) {
      return Ok(());
    }
    let mut history = self.load_history_unlocked()?;
    history.undo.push(HistoryEntry {
      restore: before.map(|bytes| String::from_utf8_lossy(&bytes).into_owned()),
      expect_fp: fingerprint(Some(after)),
    });
    trim_history(&mut history.undo);
    history.redo.clear();
    self.store_history_unlocked(&history)
  }

  fn load_history_unlocked(&self) -> Result<History, String> {
    let path = self.root.join(HISTORY_FILE);
    if !path.exists() {
      return Ok(History::default());
    }
    let text = fs::read_to_string(&path).map_err(|error| error.to_string())?;
    serde_json::from_str(&text).map_err(|error| format!("undo history is unreadable: {error}"))
  }

  fn store_history_unlocked(&self, history: &History) -> Result<(), String> {
    let bytes = serde_json::to_vec(history).map_err(|error| error.to_string())?;
    let path = self.root.join(HISTORY_FILE);
    let temp = self.root.join(".cli-history.json.tmp");
    fs::write(&temp, bytes).map_err(|error| error.to_string())?;
    fs::rename(&temp, &path).map_err(|error| {
      let _ = fs::remove_file(&temp);
      error.to_string()
    })
  }

  fn with_write_lock<T>(&self, wait: Duration, body: impl FnOnce() -> Result<T, String>) -> Result<T, String> {
    let path = self.root.join(WRITE_LOCK);
    let started = Instant::now();
    loop {
      match OpenOptions::new().write(true).create_new(true).open(&path) {
        Ok(mut file) => {
          let _ = writeln!(file, "{}\n{}", std::process::id(), unix_now());
          let result = body();
          let _ = fs::remove_file(&path);
          return result;
        }
        Err(error) if error.kind() == ErrorKind::AlreadyExists => {
          if lock_is_stale(&path) {
            let _ = fs::remove_file(&path);
            continue;
          }
          if started.elapsed() >= wait {
            return Err("data.json is locked by another writer; retry".to_string());
          }
          thread::sleep(Duration::from_millis(50));
        }
        Err(error) => return Err(error.to_string()),
      }
    }
  }

  fn read_bytes(&self) -> Result<Option<Vec<u8>>, String> {
    let path = self.data_path();
    if !path.exists() {
      return Ok(None);
    }
    fs::read(&path).map(Some).map_err(|error| error.to_string())
  }

  fn write_bytes_unlocked(&self, bytes: &[u8]) -> Result<(), String> {
    if bytes.len() > MAX_BYTES {
      return Err("Data exceeds maximum allowed size (50 MB)".to_string());
    }
    let path = self.data_path();
    let temp = path.with_extension("json.tmp");
    fs::write(&temp, bytes).map_err(|error| error.to_string())?;
    fs::rename(&temp, &path).map_err(|error| {
      let _ = fs::remove_file(&temp);
      error.to_string()
    })
  }
}

pub fn canonical_status(value: &str) -> Result<String, String> {
  let key = value.trim().to_lowercase();
  CANONICAL_STATUSES
    .iter()
    .find(|(alias, _)| *alias == key)
    .map(|(_, canonical)| (*canonical).to_string())
    .ok_or_else(|| format!("status must be one of: {}", status_list()))
}

pub fn canonical_program_type(value: &str) -> Result<String, String> {
  let key = value.trim().to_lowercase();
  CANONICAL_PROGRAM_TYPES
    .iter()
    .find(|(alias, _)| *alias == key)
    .map(|(_, canonical)| (*canonical).to_string())
    .ok_or_else(|| "program type must be one of: PhD, Master's, Bachelor's, Postdoc, Other".to_string())
}

fn canonical_fee_waiver(value: &str) -> Result<String, String> {
  canonical_from(CANONICAL_FEE_WAIVERS, value, "fee waiver must be one of: Not Requested, Requested, Granted, Denied")
}

fn canonical_document_status(value: &str) -> Result<String, String> {
  canonical_from(
    CANONICAL_DOCUMENT_STATUSES,
    value,
    "document status must be one of: Not Started, Drafting, Reviewing, Ready to Submit, Submitted",
  )
}

fn canonical_from(table: &[(&str, &str)], value: &str, error: &str) -> Result<String, String> {
  let key = value.trim().to_lowercase();
  table
    .iter()
    .find(|(alias, _)| *alias == key)
    .map(|(_, canonical)| (*canonical).to_string())
    .ok_or_else(|| error.to_string())
}

fn canonical_document_key(value: &str) -> Result<String, String> {
  match value.trim().to_lowercase().as_str() {
    "cv" => Ok("cv".to_string()),
    "sop" | "statement-of-purpose" | "statement_of_purpose" | "statementofpurpose" => Ok("statementOfPurpose".to_string()),
    "transcripts" | "transcript" => Ok("transcripts".to_string()),
    "lor1" | "lor-1" => Ok("lor1".to_string()),
    "lor2" | "lor-2" => Ok("lor2".to_string()),
    "lor3" | "lor-3" => Ok("lor3".to_string()),
    "writing-sample" | "writing_sample" | "writingsample" => Ok("writingSample".to_string()),
    _ => Err("document must be cv, statement-of-purpose, transcripts, lor1, lor2, lor3, or writing-sample".to_string()),
  }
}

fn status_list() -> String {
  let mut seen = Vec::new();
  for (_, canonical) in CANONICAL_STATUSES {
    if !seen.contains(canonical) {
      seen.push(*canonical);
    }
  }
  seen.join(", ")
}

fn new_application_value(spec: &NewApplication, university: &str, program: &str) -> Result<Value, String> {
  let id = match &spec.id {
    Some(id) => validate_id(id)?,
    None => new_id()?,
  };
  let status = canonical_status(spec.status.as_deref().unwrap_or("Not Started"))?;
  let program_type = canonical_program_type(spec.program_type.as_deref().unwrap_or("PhD"))?;
  let department = optional_text("department", spec.department.as_deref(), 500)?;
  let location = optional_text("location", spec.location.as_deref(), 500)?;
  let portal = optional_text("portal", spec.portal.as_deref(), 2000)?;
  let notes = optional_text("notes", spec.notes.as_deref(), 100_000)?;
  let tags = normalize_tags(&spec.tags)?;
  let fee = fee_value(spec.fee.unwrap_or(0.0))?;
  let deadline = match &spec.deadline {
    Some(deadline) => Value::String(canonical_date(deadline)?),
    None => Value::Null,
  };
  let term = match &spec.term {
    Some(term) => Value::String(canonical_term(term)?),
    None => Value::Null,
  };
  let year = match &spec.year {
    Some(year) => Value::String(canonical_year(year)?),
    None => Value::Null,
  };
  let mut application = json!({
    "id": id,
    "isPinned": false,
    "statusHistory": [],
    "tags": tags,
    "universityName": university,
    "programName": program,
    "programType": program_type,
    "customProgramType": "",
    "department": department,
    "location": location,
    "isR1": false,
    "universityRanking": "",
    "departmentRanking": "",
    "status": status,
    "deadline": deadline,
    "preferredDeadline": null,
    "admissionTerm": term,
    "admissionYear": year,
    "applicationFee": fee,
    "feeWaiverStatus": "Not Requested",
    "portalLink": portal,
    "documents": {
      "cv": blank_document(true),
      "statementOfPurpose": blank_document(true),
      "transcripts": blank_document(true),
      "lor1": blank_document(false),
      "lor2": blank_document(false),
      "lor3": blank_document(false),
      "writingSample": blank_document(false)
    },
    "facultyContacts": [],
    "recommenders": [],
    "reminders": [],
    "notes": notes,
    "customFields": {},
    "financialOffer": {
      "received": false,
      "stipendAmount": 0,
      "stipendFrequency": "Yearly",
      "tuitionWaiver": 0,
      "healthInsurance": "None",
      "assistantship": "None",
      "assistantshipHours": 0,
      "notes": ""
    },
    "scholarships": [],
    "englishTest": { "type": "Not Required", "status": "Not Applicable" },
    "preferredFaculty": "",
    "gre": { "status": "Not Applicable" }
  });
  if status != "Not Started" {
    append_status_history(&mut application, &status);
  }
  Ok(application)
}

fn apply_patch(app: &mut Value, patch: &ApplicationPatch) -> Result<(), String> {
  let object = app.as_object_mut().ok_or_else(|| "application is not an object".to_string())?;
  if let Some(university) = &patch.university {
    object.insert("universityName".to_string(), Value::String(require_text("university", university, 500)?));
  }
  if let Some(program) = &patch.program {
    object.insert("programName".to_string(), Value::String(require_text("program", program, 500)?));
  }
  if let Some(program_type) = &patch.program_type {
    object.insert("programType".to_string(), Value::String(canonical_program_type(program_type)?));
  }
  if let Some(department) = &patch.department {
    object.insert("department".to_string(), Value::String(require_text("department", department, 500)?));
  }
  if let Some(location) = &patch.location {
    object.insert("location".to_string(), Value::String(require_text("location", location, 500)?));
  }
  if let Some(portal) = &patch.portal {
    object.insert("portalLink".to_string(), Value::String(require_text("portal", portal, 2000)?));
  }
  if let Some(notes) = &patch.notes {
    object.insert("notes".to_string(), Value::String(bounded_text("notes", notes, 100_000)?));
  }
  if let Some(fee) = patch.fee {
    object.insert("applicationFee".to_string(), fee_value(fee)?);
  }
  if let Some(pinned) = patch.pinned {
    object.insert("isPinned".to_string(), Value::Bool(pinned));
  }
  match &patch.deadline {
    FieldChange::Unchanged => {}
    FieldChange::Clear => {
      object.insert("deadline".to_string(), Value::Null);
    }
    FieldChange::Set(deadline) => {
      object.insert("deadline".to_string(), Value::String(canonical_date(deadline)?));
    }
  }
  match &patch.term {
    FieldChange::Unchanged => {}
    FieldChange::Clear => {
      object.insert("admissionTerm".to_string(), Value::Null);
    }
    FieldChange::Set(term) => {
      object.insert("admissionTerm".to_string(), Value::String(canonical_term(term)?));
    }
  }
  match &patch.year {
    FieldChange::Unchanged => {}
    FieldChange::Clear => {
      object.insert("admissionYear".to_string(), Value::Null);
    }
    FieldChange::Set(year) => {
      object.insert("admissionYear".to_string(), Value::String(canonical_year(year)?));
    }
  }
  if !patch.add_tags.is_empty() || !patch.remove_tags.is_empty() {
    let mut tags = object
      .get("tags")
      .and_then(|value| value.as_array())
      .map(|values| values.iter().filter_map(|value| value.as_str().map(|text| text.to_string())).collect())
      .unwrap_or_else(Vec::new);
    for tag in &patch.remove_tags {
      let tag = tag.trim();
      tags.retain(|existing| existing != tag);
    }
    for tag in normalize_tags(&patch.add_tags)? {
      if !tags.iter().any(|existing| existing == &tag) {
        tags.push(tag);
      }
    }
    if tags.len() > 20 {
      return Err("an application can have at most 20 tags".to_string());
    }
    object.insert("tags".to_string(), json!(tags));
  }
  if let Some(fee_waiver) = &patch.fee_waiver {
    object.insert("feeWaiverStatus".to_string(), Value::String(canonical_fee_waiver(fee_waiver)?));
  }
  match &patch.decision_deadline {
    FieldChange::Unchanged => {}
    FieldChange::Clear => {
      object.insert("decisionDeadline".to_string(), Value::Null);
    }
    FieldChange::Set(deadline) => {
      object.insert("decisionDeadline".to_string(), Value::String(canonical_date(deadline)?));
    }
  }
  match &patch.chance {
    FieldChange::Unchanged => {}
    FieldChange::Clear => {
      object.insert("admissionChance".to_string(), Value::Null);
    }
    FieldChange::Set(chance) => {
      object.insert("admissionChance".to_string(), chance_value(*chance)?);
    }
  }
  if patch.document_status.is_some() || patch.document_required.is_some() {
    let name = patch.document.as_deref().ok_or_else(|| "--document is required".to_string())?;
    let key = canonical_document_key(name)?;
    let status = match &patch.document_status {
      Some(status) => Some(canonical_document_status(status)?),
      None => None,
    };
    let documents = object.entry("documents".to_string()).or_insert_with(|| json!({}));
    if !documents.is_object() {
      *documents = json!({});
    }
    let slot = documents.as_object_mut().expect("documents").entry(key).or_insert_with(|| json!({}));
    if !slot.is_object() {
      *slot = json!({});
    }
    let slot = slot.as_object_mut().expect("document");
    if let Some(status) = status {
      slot.insert("status".to_string(), Value::String(status));
    }
    if let Some(required) = patch.document_required {
      slot.insert("required".to_string(), Value::Bool(required));
    }
    slot.entry("submitted").or_insert(Value::Null);
  } else if patch.document.is_some() {
    return Err("--document needs --document-status or --document-required".to_string());
  }
  let status_to_record = if let Some(status) = &patch.status {
    let status = canonical_status(status)?;
    let current = object.get("status").and_then(|value| value.as_str()).unwrap_or("");
    if current != status {
      object.insert("status".to_string(), Value::String(status.clone()));
      Some(status)
    } else {
      None
    }
  } else {
    None
  };
  let _ = object;
  if let Some(status) = status_to_record {
    append_status_history(app, &status);
  }
  Ok(())
}

fn append_status_history(app: &mut Value, status: &str) {
  let history = app
    .as_object_mut()
    .expect("application object")
    .entry("statusHistory")
    .or_insert_with(|| json!([]));
  if !history.is_array() {
    *history = json!([]);
  }
  history.as_array_mut().expect("status history").push(json!({
    "status": status,
    "timestamp": Utc::now().to_rfc3339(),
  }));
}

fn normalize_import(incoming: Vec<Value>) -> Result<Vec<Value>, String> {
  let mut applications = Vec::with_capacity(incoming.len());
  let mut seen = Vec::new();
  for (index, mut app) in incoming.into_iter().enumerate() {
    let object = app.as_object_mut().ok_or_else(|| format!("import record {index} is not an object"))?;
    let university = object.get("universityName").and_then(|value| value.as_str()).unwrap_or("").trim().to_string();
    let program = object.get("programName").and_then(|value| value.as_str()).unwrap_or("").trim().to_string();
    if university.is_empty() || program.is_empty() {
      return Err(format!("import record {index} is missing universityName or programName"));
    }
    object.insert("universityName".to_string(), Value::String(university));
    object.insert("programName".to_string(), Value::String(program));
    if let Some(status) = object.get("status").cloned() {
      let status = status.as_str().ok_or_else(|| format!("import record {index} status is not text"))?;
      object.insert("status".to_string(), Value::String(canonical_status(status)?));
    }
    if let Some(program_type) = object.get("programType").cloned() {
      let program_type = program_type.as_str().ok_or_else(|| format!("import record {index} programType is not text"))?;
      object.insert("programType".to_string(), Value::String(canonical_program_type(program_type)?));
    }
    let id = match object.get("id").and_then(|value| value.as_str()) {
      Some(id) if !id.trim().is_empty() => validate_id(id)?,
      _ => new_id()?,
    };
    if seen.iter().any(|existing: &String| existing == &id) {
      return Err(format!("import contains a duplicate id {id}"));
    }
    seen.push(id.clone());
    object.insert("id".to_string(), Value::String(id));
    let _ = object;
    ensure_application_shape(&mut app)?;
    applications.push(app);
  }
  Ok(applications)
}

fn default_documents() -> Value {
  json!({
    "cv": blank_document(true),
    "statementOfPurpose": blank_document(true),
    "transcripts": blank_document(true),
    "lor1": blank_document(false),
    "lor2": blank_document(false),
    "lor3": blank_document(false),
    "writingSample": blank_document(false)
  })
}

fn blank_document(required: bool) -> Value {
  json!({ "required": required, "status": "Not Started", "submitted": null })
}

fn ensure_all_applications(doc: &mut Value) -> Result<(), String> {
  let apps = applications_mut(doc)?;
  for (index, app) in apps.iter_mut().enumerate() {
    if !app.is_object() {
      return Err(format!("application {index} is not an object"));
    }
    ensure_application_shape(app)?;
  }
  Ok(())
}

fn ensure_application_shape(app: &mut Value) -> Result<(), String> {
  let object = app.as_object_mut().ok_or_else(|| "application is not an object".to_string())?;
  insert_if_blank_text(object, "status", Value::String("Not Started".to_string()));
  insert_if_blank_text(object, "programType", Value::String("PhD".to_string()));
  insert_if_blank_text(object, "feeWaiverStatus", Value::String("Not Requested".to_string()));
  insert_if_nullish(object, "customProgramType", Value::String(String::new()));
  insert_if_nullish(object, "department", Value::String(String::new()));
  insert_if_nullish(object, "location", Value::String(String::new()));
  insert_if_nullish(object, "universityRanking", Value::String(String::new()));
  insert_if_nullish(object, "departmentRanking", Value::String(String::new()));
  insert_if_nullish(object, "portalLink", Value::String(String::new()));
  insert_if_nullish(object, "notes", Value::String(String::new()));
  insert_if_nullish(object, "preferredFaculty", Value::String(String::new()));
  insert_if_nullish(object, "isR1", Value::Bool(false));
  insert_if_nullish(object, "isPinned", Value::Bool(false));
  insert_if_nullish(object, "deadline", Value::Null);
  insert_if_nullish(object, "preferredDeadline", Value::Null);
  insert_if_nullish(object, "admissionTerm", Value::Null);
  insert_if_nullish(object, "admissionYear", Value::Null);
  insert_if_nullish(object, "applicationFee", json!(0));
  for key in ["tags", "facultyContacts", "recommenders", "reminders", "scholarships", "essays", "statusHistory"] {
    ensure_array(object, key);
  }
  ensure_documents(object);
  with_object_slot(object, "gre", |gre| {
    gre.entry("status".to_string()).or_insert(Value::String("Not Applicable".to_string()));
  });
  with_object_slot(object, "englishTest", |test| {
    test.entry("type".to_string()).or_insert(Value::String("Not Required".to_string()));
    test.entry("status".to_string()).or_insert(Value::String("Not Applicable".to_string()));
  });
  with_object_slot(object, "financialOffer", |offer| {
    offer.entry("received".to_string()).or_insert(Value::Bool(false));
    offer.entry("stipendAmount".to_string()).or_insert(json!(0));
    offer.entry("stipendFrequency".to_string()).or_insert(Value::String("Yearly".to_string()));
    offer.entry("tuitionWaiver".to_string()).or_insert(json!(0));
    offer.entry("healthInsurance".to_string()).or_insert(Value::String("None".to_string()));
    offer.entry("assistantship".to_string()).or_insert(Value::String("None".to_string()));
    offer.entry("assistantshipHours".to_string()).or_insert(json!(0));
    offer.entry("notes".to_string()).or_insert(Value::String(String::new()));
  });
  with_object_slot(object, "customFields", |_| {});
  Ok(())
}

fn insert_if_nullish(object: &mut Map<String, Value>, key: &str, value: Value) {
  if matches!(object.get(key), None | Some(Value::Null)) {
    object.insert(key.to_string(), value);
  }
}

fn insert_if_blank_text(object: &mut Map<String, Value>, key: &str, value: Value) {
  let replace = match object.get(key) {
    None | Some(Value::Null) => true,
    Some(Value::String(text)) if text.trim().is_empty() => true,
    _ => false,
  };
  if replace {
    object.insert(key.to_string(), value);
  }
}

fn ensure_array(object: &mut Map<String, Value>, key: &str) {
  if !matches!(object.get(key), Some(Value::Array(_))) {
    object.insert(key.to_string(), json!([]));
  }
}

fn with_object_slot(object: &mut Map<String, Value>, key: &str, fill: impl FnOnce(&mut Map<String, Value>)) {
  if !matches!(object.get(key), Some(Value::Object(_))) {
    object.insert(key.to_string(), json!({}));
  }
  let slot = object.get_mut(key).and_then(|value| value.as_object_mut()).expect(key);
  fill(slot);
}

fn ensure_documents(object: &mut Map<String, Value>) {
  if !matches!(object.get("documents"), Some(Value::Object(_))) {
    object.insert("documents".to_string(), default_documents());
    return;
  }
  let documents = object.get_mut("documents").and_then(|value| value.as_object_mut()).expect("documents");
  for (key, required) in DOCUMENT_SLOTS {
    if !documents.contains_key(*key) {
      documents.insert((*key).to_string(), blank_document(*required));
    }
    let slot = documents.get_mut(*key).expect("document slot");
    fill_document_slot(slot, *required);
  }
}

/// A legacy slot may be a boolean or a date string. Keep that as Submitted.
/// A blank replacement would erase it on the next unrelated write.
fn fill_document_slot(slot: &mut Value, required: bool) {
  if slot.is_object() {
    let object = slot.as_object_mut().expect("document slot");
    object.entry("required".to_string()).or_insert(Value::Bool(required));
    object.entry("status".to_string()).or_insert(Value::String("Not Started".to_string()));
    object.entry("submitted".to_string()).or_insert(Value::Null);
    return;
  }
  let preserved = if let Some(text) = slot.as_str() {
    if text.is_empty() { None } else { Some(text.to_string()) }
  } else if slot.as_bool() == Some(true) {
    Some(String::new())
  } else {
    None
  };
  if let Some(text) = preserved {
    let submitted = if text.is_empty() { Value::Null } else { Value::String(text) };
    *slot = json!({ "required": required, "status": "Submitted", "submitted": submitted });
  } else {
    *slot = blank_document(required);
  }
}

fn applications_of(doc: &Value) -> Result<&Vec<Value>, String> {
  doc.get("applications")
    .and_then(|value| value.as_array())
    .ok_or_else(|| "applications array is missing".to_string())
}

fn applications_mut(doc: &mut Value) -> Result<&mut Vec<Value>, String> {
  doc.get_mut("applications")
    .and_then(|value| value.as_array_mut())
    .ok_or_else(|| "applications array is missing".to_string())
}

fn application_haystack(app: &Value) -> String {
  let mut parts = Vec::new();
  for key in ["id", "universityName", "programName", "department", "location", "status", "notes", "portalLink", "programType"] {
    if let Some(text) = app.get(key).and_then(|value| value.as_str()) {
      parts.push(text.to_string());
    }
  }
  if let Some(tags) = app.get("tags").and_then(|value| value.as_array()) {
    for tag in tags {
      if let Some(text) = tag.as_str() {
        parts.push(text.to_string());
      }
    }
  }
  parts.join("\n")
}

fn text_field(app: &Value, key: &str) -> String {
  match app.get(key) {
    Some(Value::String(value)) => value.clone(),
    Some(Value::Number(value)) => value.to_string(),
    Some(Value::Bool(value)) => value.to_string(),
    _ => String::new(),
  }
}

fn csv_cell(value: &str) -> String {
  let guarded = if value.starts_with(['=', '+', '-', '@', '\t', '\r']) {
    format!("'{value}")
  } else {
    value.to_string()
  };
  if guarded.contains([',', '"', '\n', '\r']) {
    format!("\"{}\"", guarded.replace('"', "\"\""))
  } else {
    guarded
  }
}

fn empty_document() -> Value {
  json!({
    "version": CURRENT_DATA_VERSION,
    "applications": [],
    "lastUpdated": Utc::now().to_rfc3339(),
  })
}

fn touch_document(doc: &mut Value) {
  if let Some(object) = doc.as_object_mut() {
    object.insert("version".to_string(), json!(CURRENT_DATA_VERSION));
    object.insert("lastUpdated".to_string(), Value::String(Utc::now().to_rfc3339()));
  }
}

fn readable_document(bytes: &[u8]) -> Result<Value, String> {
  let value = parse_json_bytes(bytes)?;
  let version = detect_version(&value);
  if version > CURRENT_DATA_VERSION {
    if is_loadable_data_schema(&value) {
      return Ok(value);
    }
    return Err(format!("data.json reports version {version} but is not a loadable schema"));
  }
  migrate(value)
}

fn writable_document(bytes: &[u8]) -> Result<Value, String> {
  let value = parse_json_bytes(bytes)?;
  let version = detect_version(&value);
  if version > CURRENT_DATA_VERSION {
    return Err(format!(
      "data.json is version {version}; this CLI writes version {CURRENT_DATA_VERSION}. Refusing to downgrade it."
    ));
  }
  migrate(value)
}

fn parse_json_bytes(bytes: &[u8]) -> Result<Value, String> {
  let text = std::str::from_utf8(bytes).map_err(|_| "data.json is not valid UTF-8".to_string())?;
  serde_json::from_str(text).map_err(|_| "data.json is not valid JSON".to_string())
}

fn detect_version(value: &Value) -> u64 {
  if value.is_array() {
    return 0;
  }
  value.get("version").and_then(|version| version.as_u64()).unwrap_or(0)
}

fn migrate(mut data: Value) -> Result<Value, String> {
  let mut version = detect_version(&data);
  if version >= CURRENT_DATA_VERSION {
    if schema_ok(&data) {
      return Ok(data);
    }
    return Err("data.json failed schema validation".to_string());
  }
  while version < CURRENT_DATA_VERSION {
    data = match version {
      0 => migrate_0(data)?,
      1 => migrate_1(data)?,
      2 => migrate_2(data)?,
      _ => return Err(format!("no migration for data.json version {version}")),
    };
    version += 1;
  }
  if !schema_ok(&data) {
    return Err("migration produced an invalid schema".to_string());
  }
  Ok(data)
}

fn migrate_0(data: Value) -> Result<Value, String> {
  if let Some(apps) = data.as_array() {
    return Ok(wrap_document(1, Value::Array(apps.clone())));
  }
  if data.get("applications").and_then(|value| value.as_array()).is_some() {
    let mut doc = data;
    if let Some(object) = doc.as_object_mut() {
      object.insert("version".to_string(), json!(1));
      if object.get("lastUpdated").and_then(|value| value.as_str()).is_none() {
        object.insert("lastUpdated".to_string(), Value::String(Utc::now().to_rfc3339()));
      }
    }
    return Ok(doc);
  }
  Err("data.json is not an application list or a versioned document".to_string())
}

fn migrate_1(data: Value) -> Result<Value, String> {
  let mut doc = data;
  let apps = doc
    .get_mut("applications")
    .and_then(|value| value.as_array_mut())
    .ok_or_else(|| "version 1 document has no applications array".to_string())?;
  for app in apps.iter_mut() {
    let Some(object) = app.as_object_mut() else {
      continue;
    };
    object.entry("isPinned").or_insert(Value::Bool(false));
    object.entry("statusHistory").or_insert_with(|| json!([]));
  }
  if let Some(object) = doc.as_object_mut() {
    object.insert("version".to_string(), json!(2));
    object.insert("lastUpdated".to_string(), Value::String(Utc::now().to_rfc3339()));
  }
  Ok(doc)
}

fn migrate_2(data: Value) -> Result<Value, String> {
  let mut doc = data;
  if let Some(object) = doc.as_object_mut() {
    object.insert("version".to_string(), json!(3));
    object.insert("lastUpdated".to_string(), Value::String(Utc::now().to_rfc3339()));
  }
  Ok(doc)
}

fn wrap_document(version: u64, applications: Value) -> Value {
  json!({
    "version": version,
    "applications": applications,
    "lastUpdated": Utc::now().to_rfc3339(),
  })
}

fn schema_ok(value: &Value) -> bool {
  value.get("version").and_then(|version| version.as_u64()).is_some()
    && value.get("applications").and_then(|apps| apps.as_array()).is_some()
    && value.get("lastUpdated").and_then(|stamp| stamp.as_str()).is_some()
}

pub fn is_loadable_data_schema(value: &Value) -> bool {
  if value.is_array() {
    return true;
  }
  value.get("applications").map(|applications| applications.is_array()).unwrap_or(false)
}

fn serialize_document(data: &Value) -> Result<Vec<u8>, String> {
  serde_json::to_vec_pretty(data).map_err(|error| error.to_string())
}

fn fingerprint(bytes: Option<&[u8]>) -> String {
  let Some(bytes) = bytes else {
    return "absent".to_string();
  };
  let mut hash: u64 = 0xcbf29ce484222325;
  for byte in bytes {
    hash ^= u64::from(*byte);
    hash = hash.wrapping_mul(0x100000001b3);
  }
  format!("{hash:016x}")
}

fn trim_history(entries: &mut Vec<HistoryEntry>) {
  while entries.len() > HISTORY_LIMIT {
    entries.remove(0);
  }
}

fn lock_is_stale(path: &Path) -> bool {
  let pid_alive = read_lock_pid(path).map(process_alive).unwrap_or(false);
  if !pid_alive {
    return true;
  }
  let Ok(text) = fs::read_to_string(path) else {
    return true;
  };
  let Some(stamp) = text.lines().nth(1).and_then(|line| line.parse::<u64>().ok()) else {
    return false;
  };
  unix_now().saturating_sub(stamp) > LOCK_STALE.as_secs()
}

fn read_lock_pid(path: &Path) -> Result<u32, String> {
  let text = fs::read_to_string(path).map_err(|error| error.to_string())?;
  text
    .lines()
    .next()
    .unwrap_or("")
    .trim()
    .parse::<u32>()
    .map_err(|_| format!("lock file {} does not start with a pid", path.display()))
}

fn process_alive(pid: u32) -> bool {
  if pid == 0 {
    return false;
  }
  #[cfg(unix)]
  {
    Command::new("kill")
      .args(["-0", &pid.to_string()])
      .stdout(std::process::Stdio::null())
      .stderr(std::process::Stdio::null())
      .status()
      .map(|status| status.success())
      .unwrap_or(true)
  }
  #[cfg(not(unix))]
  {
    let _ = pid;
    true
  }
}

fn unix_now() -> u64 {
  SystemTime::now().duration_since(UNIX_EPOCH).map(|duration| duration.as_secs()).unwrap_or(0)
}

fn new_id() -> Result<String, String> {
  let mut bytes = [0u8; 16];
  getrandom::fill(&mut bytes).map_err(|error| format!("could not generate an id: {error}"))?;
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  Ok(format!(
    "{:02x}{:02x}{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}{:02x}{:02x}{:02x}{:02x}",
    bytes[0], bytes[1], bytes[2], bytes[3], bytes[4], bytes[5], bytes[6], bytes[7], bytes[8], bytes[9], bytes[10], bytes[11], bytes[12], bytes[13], bytes[14], bytes[15]
  ))
}

fn validate_id(id: &str) -> Result<String, String> {
  let id = id.trim();
  if id.is_empty() || id.len() > 128 {
    return Err("id must be 1 to 128 characters".to_string());
  }
  if id.contains(['/', '\\']) || id.chars().any(|ch| ch.is_control()) {
    return Err("id cannot contain path separators or control characters".to_string());
  }
  Ok(id.to_string())
}

fn require_text(label: &str, value: &str, max: usize) -> Result<String, String> {
  let text = value.trim();
  if text.is_empty() {
    return Err(format!("{label} is required"));
  }
  bounded_text(label, text, max)
}

fn optional_text(label: &str, value: Option<&str>, max: usize) -> Result<String, String> {
  match value {
    Some(value) => bounded_text(label, value.trim(), max),
    None => Ok(String::new()),
  }
}

fn bounded_text(label: &str, value: &str, max: usize) -> Result<String, String> {
  if value.chars().count() > max {
    return Err(format!("{label} is longer than {max} characters"));
  }
  Ok(value.to_string())
}

fn normalize_tags(tags: &[String]) -> Result<Vec<String>, String> {
  let mut out = Vec::new();
  for tag in tags {
    let tag = tag.trim();
    if tag.is_empty() {
      continue;
    }
    if tag.chars().count() > 40 {
      return Err("a tag is longer than 40 characters".to_string());
    }
    if !out.iter().any(|existing: &String| existing == tag) {
      out.push(tag.to_string());
    }
  }
  if out.len() > 20 {
    return Err("an application can have at most 20 tags".to_string());
  }
  Ok(out)
}

fn fee_value(fee: f64) -> Result<Value, String> {
  if !fee.is_finite() || fee < 0.0 {
    return Err("fee must be a non-negative number".to_string());
  }
  if fee > 1_000_000.0 {
    return Err("fee is unreasonably large".to_string());
  }
  whole_number(fee)
}

fn chance_value(chance: f64) -> Result<Value, String> {
  if !chance.is_finite() || !(0.0..=100.0).contains(&chance) {
    return Err("admission chance must be between 0 and 100".to_string());
  }
  whole_number(chance)
}

fn whole_number(value: f64) -> Result<Value, String> {
  if value.fract() == 0.0 {
    Ok(json!(value as u64))
  } else {
    Ok(json!(value))
  }
}

fn canonical_date(value: &str) -> Result<String, String> {
  let value = value.trim();
  chrono::NaiveDate::parse_from_str(value, "%Y-%m-%d")
    .map(|date| date.format("%Y-%m-%d").to_string())
    .map_err(|_| format!("deadline must be YYYY-MM-DD, got {value}"))
}

fn canonical_term(value: &str) -> Result<String, String> {
  match value.trim().to_lowercase().as_str() {
    "fall" => Ok("Fall".to_string()),
    "spring" => Ok("Spring".to_string()),
    "summer" => Ok("Summer".to_string()),
    _ => Err("term must be Fall, Spring, or Summer".to_string()),
  }
}

fn canonical_year(value: &str) -> Result<String, String> {
  let value = value.trim();
  let year: u16 = value.parse().map_err(|_| format!("year must be a four-digit year, got {value}"))?;
  if !(1900..=2200).contains(&year) {
    return Err(format!("year must be between 1900 and 2200, got {value}"));
  }
  Ok(year.to_string())
}

#[cfg(test)]
mod tests {
  use super::*;
  use std::sync::atomic::{AtomicU64, Ordering};

  static TEMP_SEQ: AtomicU64 = AtomicU64::new(0);

  struct TempDir(PathBuf);

  impl TempDir {
    fn new() -> Self {
      let n = TEMP_SEQ.fetch_add(1, Ordering::Relaxed);
      let path = std::env::temp_dir().join(format!("academiatrack-store-{}-{}-{}", std::process::id(), n, unix_now()));
      fs::create_dir_all(&path).unwrap();
      Self(path)
    }

    fn store(&self) -> Store {
      Store::open(&self.0).unwrap()
    }
  }

  impl Drop for TempDir {
    fn drop(&mut self) {
      let _ = fs::remove_dir_all(&self.0);
    }
  }

  fn sample(university: &str, program: &str) -> NewApplication {
    NewApplication {
      id: None,
      university: university.to_string(),
      program: program.to_string(),
      program_type: Some("PhD".to_string()),
      department: Some("EECS".to_string()),
      location: None,
      status: None,
      deadline: Some("2026-12-15".to_string()),
      portal: None,
      notes: Some("reach".to_string()),
      fee: Some(90.0),
      term: Some("Fall".to_string()),
      year: Some("2027".to_string()),
      tags: vec!["dream".to_string()],
    }
  }

  #[test]
  fn schema_version_matches_typescript() {
    let migration = include_str!("../../utils/dataMigration.ts");
    assert!(migration.contains("export const CURRENT_DATA_VERSION = 3;"));
    let enums = include_str!("../../types/enums.ts");
    for (_, status) in CANONICAL_STATUSES {
      assert!(enums.contains(&format!("'{status}'")), "{status}");
    }
    for (_, program_type) in CANONICAL_PROGRAM_TYPES {
      assert!(enums.contains(&format!("\"{program_type}\"")), "{program_type}");
    }
    for (_, status) in CANONICAL_DOCUMENT_STATUSES {
      assert!(enums.contains(&format!("'{status}'")), "{status}");
    }
    for (_, waiver) in CANONICAL_FEE_WAIVERS {
      assert!(enums.contains(&format!("'{waiver}'")), "{waiver}");
    }
  }

  #[test]
  fn add_writes_ui_shaped_version_3_document() {
    let dir = TempDir::new();
    let store = dir.store();
    let added = store.add_application(sample("MIT", "EECS PhD")).unwrap();
    assert_eq!(added["universityName"], "MIT");
    assert_eq!(added["documents"]["cv"]["required"], true);
    assert_eq!(added["gre"]["status"], "Not Applicable");
    assert!(added["facultyContacts"].is_array());
    let raw = store.load_raw().unwrap().unwrap();
    assert_eq!(raw["version"], 3);
    assert_eq!(raw["applications"].as_array().unwrap().len(), 1);
    assert!(!store.data_path().with_extension("json.tmp").exists());
    assert!(store.root().join(HISTORY_FILE).exists());
  }

  #[test]
  fn update_preserves_unknown_fields_and_appends_history() {
    let dir = TempDir::new();
    let store = dir.store();
    let added = store.add_application(sample("Stanford", "CS PhD")).unwrap();
    let id = added["id"].as_str().unwrap().to_string();
    let mut raw = store.load_raw().unwrap().unwrap();
    raw.as_object_mut().unwrap().insert("extraRoot".to_string(), json!(true));
    raw["applications"][0].as_object_mut().unwrap().insert("customNote".to_string(), json!("keep"));
    store.save_raw(&raw).unwrap();
    let mut patch = ApplicationPatch::default();
    patch.status = Some("submitted".to_string());
    let updated = store.update_application(&id, patch).unwrap();
    assert_eq!(updated["status"], "Submitted");
    assert_eq!(updated["customNote"], "keep");
    assert_eq!(updated["statusHistory"][0]["status"], "Submitted");
    let saved = store.load_raw().unwrap().unwrap();
    assert_eq!(saved["extraRoot"], true);
  }

  #[test]
  fn legacy_array_is_kept_and_migrated_on_write() {
    let dir = TempDir::new();
    let store = dir.store();
    fs::write(store.data_path(), br#"[{"id":"old","universityName":"CMU","programName":"ML"}]"#).unwrap();
    let listed = store.list_applications(None, None).unwrap();
    assert_eq!(listed["count"], 1);
    assert_eq!(fs::read(store.data_path()).unwrap(), br#"[{"id":"old","universityName":"CMU","programName":"ML"}]"#);
    store.add_application(sample("Berkeley", "EECS")).unwrap();
    let saved = store.load_raw().unwrap().unwrap();
    assert_eq!(saved["version"], 3);
    assert_eq!(saved["applications"].as_array().unwrap().len(), 2);
    assert_eq!(saved["applications"][0]["id"], "old");
  }

  #[test]
  fn refuses_to_downgrade_a_newer_schema() {
    let dir = TempDir::new();
    let store = dir.store();
    fs::write(
      store.data_path(),
      r#"{"version":4,"applications":[{"id":"a","universityName":"U","programName":"P"}],"lastUpdated":"2026-01-01T00:00:00Z"}"#,
    )
    .unwrap();
    let error = store.add_application(sample("U2", "P2")).unwrap_err();
    assert!(error.contains("version 4"), "{error}");
    let text = fs::read_to_string(store.data_path()).unwrap();
    assert!(text.contains("\"version\":4") || text.contains("\"version\": 4"));
  }

  #[test]
  fn undo_restores_exact_bytes_and_refuses_after_an_outside_write() {
    let dir = TempDir::new();
    let store = dir.store();
    store.add_application(sample("ETH", "CS")).unwrap();
    let original = fs::read(store.data_path()).unwrap();
    let added = store.load_raw().unwrap().unwrap();
    let id = added["applications"][0]["id"].as_str().unwrap().to_string();
    let mut patch = ApplicationPatch::default();
    patch.notes = Some("changed".to_string());
    store.update_application(&id, patch).unwrap();
    store.undo().unwrap();
    assert_eq!(fs::read(store.data_path()).unwrap(), original);
    fs::write(store.data_path(), br#"{"version":3,"applications":[],"lastUpdated":"x"}"#).unwrap();
    let error = store.undo().unwrap_err();
    assert!(error.contains("changed after"), "{error}");
    assert!(fs::read_to_string(store.data_path()).unwrap().contains("\"applications\":[]") || fs::read_to_string(store.data_path()).unwrap().contains("\"applications\": []"));
  }

  #[test]
  fn redo_reapplies_the_command() {
    let dir = TempDir::new();
    let store = dir.store();
    store.add_application(sample("Oxford", "CS")).unwrap();
    store.undo().unwrap();
    assert_eq!(store.load_raw().unwrap(), None);
    store.redo().unwrap();
    assert_eq!(store.load_raw().unwrap().unwrap()["applications"].as_array().unwrap().len(), 1);
  }

  #[test]
  fn size_cap_rejects_without_replacing_the_file() {
    let dir = TempDir::new();
    let store = dir.store();
    store.add_application(sample("U", "P")).unwrap();
    let before = fs::read(store.data_path()).unwrap();
    let huge = json!({ "version": 3, "applications": [], "lastUpdated": "x".repeat(MAX_BYTES) });
    let error = store.save_raw(&huge).unwrap_err();
    assert!(error.contains("50 MB"), "{error}");
    assert_eq!(fs::read(store.data_path()).unwrap(), before);
  }

  #[test]
  fn restore_rejects_corrupt_backup_without_clobbering() {
    let dir = TempDir::new();
    let store = dir.store();
    store.add_application(sample("U", "P")).unwrap();
    let before = fs::read(store.data_path()).unwrap();
    fs::write(store.root().join(".backup").join("backup-bad.json"), b"not-json").unwrap();
    let error = store.restore_backup("backup-bad.json").unwrap_err();
    assert!(error.contains("not valid JSON"), "{error}");
    assert_eq!(fs::read(store.data_path()).unwrap(), before);
    fs::write(store.root().join(".backup").join("backup-shape.json"), b"{\"nope\":1}").unwrap();
    let error = store.restore_backup("backup-shape.json").unwrap_err();
    assert!(error.contains("unrecognized"), "{error}");
    assert_eq!(fs::read(store.data_path()).unwrap(), before);
  }

  #[cfg(unix)]
  #[test]
  fn live_desktop_lock_blocks_writes_and_a_dead_lock_does_not() {
    let dir = TempDir::new();
    let store = dir.store();
    fs::write(store.root().join(DESKTOP_LOCK), "999999\n").unwrap();
    store.add_application(sample("U", "P")).unwrap();

    let mut child = Command::new("sleep").arg("30").spawn().unwrap();
    fs::write(store.root().join(DESKTOP_LOCK), format!("{}\n", child.id())).unwrap();
    let error = store.add_application(sample("U2", "P2")).unwrap_err();
    assert!(error.contains("desktop is running"), "{error}");
    let _ = child.kill();
    let _ = child.wait();
  }

  #[cfg(unix)]
  #[test]
  fn fresh_foreign_lock_is_reported() {
    let dir = TempDir::new();
    let store = dir.store();
    let mut child = Command::new("sleep").arg("30").spawn().unwrap();
    let stamp = unix_now();
    fs::write(store.root().join(WRITE_LOCK), format!("{}\n{stamp}\n", child.id())).unwrap();
    let error = store.save_raw(&empty_document()).unwrap_err();
    assert!(error.contains("locked"), "{error}");
    let _ = child.kill();
    let _ = child.wait();
  }

  #[test]
  fn save_raw_does_not_record_cli_history() {
    let dir = TempDir::new();
    let store = dir.store();
    store.save_raw(&empty_document()).unwrap();
    assert!(!store.root().join(HISTORY_FILE).exists());
  }

  #[test]
  fn search_import_and_deadlines_round_trip() {
    let dir = TempDir::new();
    let store = dir.store();
    let added = store.add_application(sample("Carnegie Mellon", "Machine Learning")).unwrap();
    let found = store.search_applications("carnegie").unwrap();
    assert_eq!(found["count"], 1);
    let upcoming = store.upcoming_deadlines(3650).unwrap();
    assert_eq!(upcoming["count"], 1);
    let id = added["id"].as_str().unwrap();
    store.delete_application(id).unwrap();
    let again = store.delete_application(id).unwrap();
    assert_eq!(again["deleted"], 0);
    let imported = store
      .import_applications(
        vec![json!({"universityName":"Yale","programName":"CS","notes":"=cmd"})],
        false,
      )
      .unwrap();
    assert_eq!(imported["imported"], 1);
    let csv = store.export_csv().unwrap();
    assert!(csv.contains("Yale"));
    assert!(csv.contains("'=cmd"));
  }

  #[test]
  fn import_partial_record_matches_the_ui_shape_and_rejects_a_duplicate_id() {
    let dir = TempDir::new();
    let store = dir.store();
    store
      .import_applications(vec![json!({"universityName":"Yale","programName":"CS","extraField":"kept"})], false)
      .unwrap();
    let saved = store.load_raw().unwrap().unwrap();
    let app = &saved["applications"][0];
    assert_eq!(app["status"], "Not Started");
    assert_eq!(app["programType"], "PhD");
    assert_eq!(app["applicationFee"], 0);
    assert_eq!(app["feeWaiverStatus"], "Not Requested");
    assert_eq!(app["documents"]["cv"]["required"], true);
    assert_eq!(app["documents"]["lor1"]["required"], false);
    assert_eq!(app["financialOffer"]["received"], false);
    assert_eq!(app["financialOffer"]["stipendFrequency"], "Yearly");
    assert_eq!(app["gre"]["status"], "Not Applicable");
    assert_eq!(app["extraField"], "kept");

    let error = store
      .import_applications(
        vec![
          json!({"id":"same","universityName":"A","programName":"B"}),
          json!({"id":"same","universityName":"C","programName":"D"}),
        ],
        true,
      )
      .unwrap_err();
    assert!(error.contains("already exists") || error.contains("duplicate"), "{error}");
    assert_eq!(store.load_raw().unwrap().unwrap()["applications"].as_array().unwrap().len(), 1);
  }

  #[test]
  fn update_document_fee_waiver_and_decision_deadline() {
    let dir = TempDir::new();
    let store = dir.store();
    let added = store.add_application(sample("MIT", "EECS PhD")).unwrap();
    let id = added["id"].as_str().unwrap().to_string();
    let mut patch = ApplicationPatch::default();
    patch.fee_waiver = Some("granted".to_string());
    patch.decision_deadline = FieldChange::Set("2030-04-15".to_string());
    patch.chance = FieldChange::Set(40.0);
    patch.document = Some("cv".to_string());
    patch.document_status = Some("ready to submit".to_string());
    patch.document_required = Some(true);
    let updated = store.update_application(&id, patch).unwrap();
    assert_eq!(updated["feeWaiverStatus"], "Granted");
    assert_eq!(updated["decisionDeadline"], "2030-04-15");
    assert_eq!(updated["admissionChance"], 40);
    assert_eq!(updated["documents"]["cv"]["status"], "Ready to Submit");
    assert_eq!(updated["documents"]["cv"]["required"], true);
  }
}
