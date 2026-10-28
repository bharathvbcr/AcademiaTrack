//! Binary tests for `academiatrack`. Every write passes `--data-dir`.

use serde_json::Value;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};

static TEMP_SEQ: AtomicU64 = AtomicU64::new(0);

struct Output {
  code: i32,
  stdout: String,
  stderr: String,
}

struct KillOnDrop(Child);

impl Drop for KillOnDrop {
  fn drop(&mut self) {
    let _ = self.0.kill();
    let _ = self.0.wait();
  }
}

fn temp_dir() -> PathBuf {
  let n = TEMP_SEQ.fetch_add(1, Ordering::Relaxed);
  let nanos = SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_nanos()).unwrap_or(0);
  let path = std::env::temp_dir().join(format!("academiatrack-e2e-{}-{}-{}", std::process::id(), nanos, n));
  fs::create_dir_all(&path).unwrap();
  path
}

fn academiatrack(dir: Option<&Path>, args: &[&str]) -> Output {
  let mut command = Command::new(env!("CARGO_BIN_EXE_academiatrack"));
  command.env_remove("ACADEMIATRACK_DATA_DIR");
  command.stdin(Stdio::null());
  if let Some(dir) = dir {
    command.arg("--data-dir").arg(dir);
  }
  command.args(args);
  let output = command.output().expect("spawn academiatrack");
  Output {
    code: output.status.code().unwrap_or(1),
    stdout: String::from_utf8_lossy(&output.stdout).into_owned(),
    stderr: String::from_utf8_lossy(&output.stderr).into_owned(),
  }
}

fn json_ok(output: &Output) -> Value {
  assert_eq!(output.code, 0, "stdout:\n{}\nstderr:\n{}", output.stdout, output.stderr);
  serde_json::from_str(output.stdout.trim()).unwrap_or_else(|error| {
    panic!("stdout is not JSON ({error}): {}", output.stdout);
  })
}

#[test]
fn agent_workflow_round_trip() {
  let dir = temp_dir();
  println!("e2e data dir: {}", dir.display());
  println!("e2e data file: {}", dir.join("data.json").display());

  let added = json_ok(&academiatrack(
    Some(&dir),
    &["--json", "application", "add", "--university", "MIT", "--program", "EECS PhD", "--deadline", "2030-06-01"],
  ));
  assert_eq!(added["command"], "application.add");
  assert_eq!(added["data"]["documents"]["cv"]["required"], true);
  assert_eq!(added["data"]["documents"]["cv"]["status"], "Not Started");
  let id = added["data"]["id"].as_str().unwrap().to_string();

  let updated = json_ok(&academiatrack(Some(&dir), &["--json", "application", "update", &id, "--status", "submitted"]));
  assert_eq!(updated["data"]["status"], "Submitted");

  let found = json_ok(&academiatrack(Some(&dir), &["--json", "application", "search", "eecs", "phd"]));
  assert_eq!(found["data"]["count"], 1);

  let upcoming = json_ok(&academiatrack(Some(&dir), &["--json", "deadline", "upcoming", "--days", "3660"]));
  assert_eq!(upcoming["data"]["count"], 1);

  let csv_path = dir.join("export.csv");
  println!("e2e csv: {}", csv_path.display());
  let exported = json_ok(&academiatrack(
    Some(&dir),
    &["--json", "export", "csv", "-o", csv_path.to_str().unwrap()],
  ));
  assert_eq!(exported["command"], "export.csv");
  let csv = fs::read_to_string(&csv_path).unwrap();
  assert!(csv.contains("MIT"));
  assert!(csv.contains("Submitted"));

  json_ok(&academiatrack(Some(&dir), &["--json", "undo"]));
  let undone = json_ok(&academiatrack(Some(&dir), &["--json", "application", "get", &id]));
  assert_eq!(undone["data"]["status"], "Not Started");

  json_ok(&academiatrack(Some(&dir), &["--json", "redo"]));
  let redone = json_ok(&academiatrack(Some(&dir), &["--json", "application", "get", &id]));
  assert_eq!(redone["data"]["status"], "Submitted");

  let backup = json_ok(&academiatrack(Some(&dir), &["--json", "backup", "create"]));
  let backup_path = backup["data"]["path"].as_str().unwrap();
  println!("e2e backup: {backup_path}");
  let filename = Path::new(backup_path).file_name().unwrap().to_str().unwrap().to_string();

  let deleted = json_ok(&academiatrack(Some(&dir), &["--json", "application", "delete", &id]));
  assert_eq!(deleted["data"]["deleted"], 1);
  let missing = academiatrack(Some(&dir), &["--json", "application", "get", &id]);
  assert_eq!(missing.code, 1);

  json_ok(&academiatrack(Some(&dir), &["--json", "backup", "restore", &filename]));
  let restored = json_ok(&academiatrack(Some(&dir), &["--json", "application", "get", &id]));
  assert_eq!(restored["data"]["universityName"], "MIT");
  assert_eq!(restored["data"]["status"], "Submitted");

  let _ = fs::remove_dir_all(dir);
}

#[test]
fn help_exits_zero_and_a_pipe_without_a_command_exits_two() {
  let help = academiatrack(None, &["--help"]);
  assert_eq!(help.code, 0, "{}", help.stderr);
  assert!(help.stdout.contains("application add"));

  let piped = academiatrack(None, &[]);
  assert_eq!(piped.code, 2, "stdout:\n{}\nstderr:\n{}", piped.stdout, piped.stderr);
  assert!(piped.stderr.contains("No command given") || piped.stderr.contains("Usage"));
}

#[test]
fn future_schema_is_not_downgraded() {
  let dir = temp_dir();
  let path = dir.join("data.json");
  let original = r#"{"version":4,"applications":[{"id":"keep","universityName":"Old","programName":"Old"}],"lastUpdated":"2020-01-01T00:00:00Z"}"#;
  fs::write(&path, original).unwrap();
  let before = fs::read(&path).unwrap();
  let refused = academiatrack(Some(&dir), &["--json", "application", "add", "--university", "MIT", "--program", "EECS PhD"]);
  assert_eq!(refused.code, 1, "{}", refused.stdout);
  let body: Value = serde_json::from_str(refused.stdout.trim()).unwrap();
  assert_eq!(body["ok"], false);
  assert!(body["error"].as_str().unwrap().contains("Refusing to downgrade"), "{}", body);
  assert_eq!(fs::read(&path).unwrap(), before);
  let _ = fs::remove_dir_all(dir);
}

#[test]
fn legacy_array_migrates_on_write_and_keeps_the_old_row() {
  let dir = temp_dir();
  fs::write(dir.join("data.json"), r#"[{"id":"legacy","universityName":"Legacy U","programName":"Physics"}]"#).unwrap();
  json_ok(&academiatrack(Some(&dir), &["--json", "application", "add", "--university", "MIT", "--program", "EECS PhD"]));
  let document: Value = serde_json::from_str(&fs::read_to_string(dir.join("data.json")).unwrap()).unwrap();
  assert_eq!(document["version"], 3);
  let apps = document["applications"].as_array().unwrap();
  assert_eq!(apps.len(), 2);
  assert!(apps.iter().any(|app| app["universityName"] == "Legacy U"));
  let _ = fs::remove_dir_all(dir);
}

#[test]
fn unknown_root_and_application_keys_survive_update() {
  let dir = temp_dir();
  fs::write(
    dir.join("data.json"),
    r#"{"version":3,"extraRoot":"keep-me","applications":[{"id":"row-1","universityName":"U","programName":"P","status":"Not Started","extraField":"also-kept"}],"lastUpdated":"2020-01-01T00:00:00Z"}"#,
  )
  .unwrap();
  json_ok(&academiatrack(Some(&dir), &["--json", "application", "update", "row-1", "--notes", "hello"]));
  let document: Value = serde_json::from_str(&fs::read_to_string(dir.join("data.json")).unwrap()).unwrap();
  assert_eq!(document["extraRoot"], "keep-me");
  assert_eq!(document["applications"][0]["extraField"], "also-kept");
  assert_eq!(document["applications"][0]["notes"], "hello");
  let _ = fs::remove_dir_all(dir);
}

#[cfg(unix)]
#[test]
fn live_desktop_lock_blocks_and_a_dead_lock_is_recovered() {
  let dir = temp_dir();
  let lock = dir.join("desktop.lock");
  fs::write(&lock, "999999\n").unwrap();
  json_ok(&academiatrack(Some(&dir), &["--json", "application", "add", "--university", "MIT", "--program", "EECS PhD"]));

  let child = Command::new("sleep").arg("30").stdin(Stdio::null()).spawn().expect("spawn sleep");
  let pid = child.id();
  let child = KillOnDrop(child);
  fs::write(&lock, format!("{pid}\n")).unwrap();
  let blocked = academiatrack(Some(&dir), &["--json", "application", "add", "--university", "Other", "--program", "CS"]);
  assert_eq!(blocked.code, 1, "{}", blocked.stdout);
  let body: Value = serde_json::from_str(blocked.stdout.trim()).unwrap();
  assert!(body["error"].as_str().unwrap().contains(&pid.to_string()), "{}", body);
  drop(child);

  json_ok(&academiatrack(Some(&dir), &["--json", "application", "add", "--university", "Other", "--program", "CS"]));
  let _ = fs::remove_dir_all(dir);
}
