//! `academiatrack` command line. Agents should pass `--json` and read stdout.

use crate::store::{
  canonical_program_type, canonical_status, default_data_dir, ApplicationPatch, FieldChange, NewApplication, Store,
};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::io::{self, IsTerminal, Write};
use std::path::PathBuf;

const HELP: &str = "\
AcademiaTrack CLI

Reads and writes the desktop data.json store (not browser localStorage).
Close the AcademiaTrack window before writing. An open window keeps applications
in memory and will overwrite CLI changes on its next edit.

Usage:
  academiatrack [--json] [--data-dir DIR] <command>

Commands:
  status
  application list [--status STATUS] [--limit N]
  application get ID
  application add --university NAME --program NAME [options]
  application update ID [options]
  application delete ID
  application search QUERY
  deadline upcoming [--days N]
  deadline overdue
  export json|csv [-o PATH]
  import PATH [--merge]
  backup create|list|restore FILE|delete FILE
  undo
  redo

Add options:
  --id ID --department TEXT --location TEXT --program-type TYPE
  --status STATUS --deadline YYYY-MM-DD --portal URL --notes TEXT
  --fee N --term Fall|Spring|Summer --year YYYY --tag TAG

Update options:
  the add options, plus --deadline none, --term none, --year none,
  --pinned true|false, --untag TAG, --fee-waiver STATUS,
  --decision-deadline YYYY-MM-DD|none, --chance N|none,
  --document NAME --document-status STATUS --document-required true|false

Global:
  --json       print one JSON object on stdout
  --data-dir   override the app data directory
  --help       show this help
  --version    print the version

With no command, an interactive terminal opens a REPL. A pipe with no command
exits 2 so agents do not hang.

Skill: skills/cli-anything-academiatrack/SKILL.md
";

struct Parsed {
  json: bool,
  data_dir: Option<PathBuf>,
  help: bool,
  version: bool,
  positionals: Vec<String>,
  values: HashMap<String, Vec<String>>,
  switches: HashMap<String, bool>,
}

struct Failure {
  code: i32,
  command: String,
  message: String,
}

pub struct Output {
  pub code: i32,
  pub stdout: String,
  pub stderr: String,
}

pub fn cli_main() -> i32 {
  let args: Vec<String> = std::env::args().skip(1).collect();
  let output = execute(&args);
  print!("{}", output.stdout);
  eprint!("{}", output.stderr);
  let _ = io::stdout().flush();
  output.code
}

pub fn execute(args: &[String]) -> Output {
  if args.is_empty() {
    if io::stdin().is_terminal() {
      return repl(None, false);
    }
    return Output {
      code: 2,
      stdout: String::new(),
      stderr: format!("{HELP}\nNo command given.\n"),
    };
  }
  match run_command(args, None) {
    Ok(output) => output,
    Err(failure) => render_failure(&failure, args_request_json(args)),
  }
}

fn repl(data_dir: Option<PathBuf>, json_mode: bool) -> Output {
  let dir = match data_dir.or_else(|| default_data_dir().ok()) {
    Some(dir) => dir,
    None => {
      return Output {
        code: 1,
        stdout: String::new(),
        stderr: "could not resolve the data directory; pass --data-dir\n".to_string(),
      };
    }
  };
  println!(
    "AcademiaTrack CLI {}\nData: {}\nType 'help' or 'exit'. Skill: skills/cli-anything-academiatrack/SKILL.md",
    env!("CARGO_PKG_VERSION"),
    dir.display()
  );
  let stdin = io::stdin();
  loop {
    print!("academiatrack> ");
    let _ = io::stdout().flush();
    let mut line = String::new();
    match stdin.read_line(&mut line) {
      Ok(0) => break,
      Ok(_) => {}
      Err(error) => {
        eprintln!("read failed: {error}");
        return Output { code: 1, stdout: String::new(), stderr: String::new() };
      }
    }
    let line = line.trim();
    if line.is_empty() {
      continue;
    }
    if line == "exit" || line == "quit" {
      break;
    }
    let tokens = match split_line(line) {
      Ok(tokens) => tokens,
      Err(error) => {
        eprintln!("{error}");
        continue;
      }
    };
    if tokens.is_empty() {
      continue;
    }
    match run_command(&tokens, Some(dir.clone())) {
      Ok(output) => {
        print!("{}", output.stdout);
        eprint!("{}", output.stderr);
      }
      Err(failure) => {
        let rendered = render_failure(&failure, json_mode || tokens.iter().any(|token| token == "--json"));
        print!("{}", rendered.stdout);
        eprint!("{}", rendered.stderr);
      }
    }
    let _ = io::stdout().flush();
  }
  println!("goodbye");
  Output { code: 0, stdout: String::new(), stderr: String::new() }
}

fn run_command(args: &[String], forced_dir: Option<PathBuf>) -> Result<Output, Failure> {
  let parsed = parse_args(args).map_err(|message| Failure { code: 2, command: String::new(), message })?;
  if parsed.help || (parsed.positionals.is_empty() && !parsed.version) {
    if parsed.positionals.is_empty() && !parsed.help && !parsed.version {
      if io::stdin().is_terminal() {
        return Ok(repl(parsed.data_dir.or(forced_dir), parsed.json));
      }
      return Err(Failure { code: 2, command: String::new(), message: "no command given".to_string() });
    }
    if parsed.help || parsed.positionals.first().map(String::as_str) == Some("help") {
      return Ok(Output { code: 0, stdout: HELP.to_string(), stderr: String::new() });
    }
  }
  if parsed.version || parsed.positionals.first().map(String::as_str) == Some("version") {
    return Ok(Output {
      code: 0,
      stdout: format!("{}\n", env!("CARGO_PKG_VERSION")),
      stderr: String::new(),
    });
  }
  let dir = match parsed.data_dir.clone().or(forced_dir) {
    Some(dir) => dir,
    None => default_data_dir().map_err(|message| Failure { code: 1, command: command_name(&parsed), message })?,
  };
  let store = Store::open(&dir).map_err(|message| Failure { code: 1, command: command_name(&parsed), message })?;
  let (command, data) = dispatch(&store, &parsed)?;
  Ok(render_success(parsed.json, &command, data))
}

fn dispatch(store: &Store, parsed: &Parsed) -> Result<(String, Value), Failure> {
  let command = command_name(parsed);
  let fail = |message: String| Failure { code: 1, command: command.clone(), message };
  let usage = |message: String| Failure { code: 2, command: command.clone(), message };
  let group = parsed.positionals.first().map(String::as_str).unwrap_or("");
  let action = parsed.positionals.get(1).map(String::as_str).unwrap_or("");
  let result = match (group, action) {
    ("status", "") => store.status().map(|data| ("status".to_string(), data)),
    ("application", "list") => {
      let status = optional_one(parsed, "status").map_err(usage)?;
      let limit = optional_limit(parsed).map_err(usage)?;
      store
        .list_applications(status.as_deref(), limit)
        .map(|data| ("application.list".to_string(), data))
    }
    ("application", "get") => {
      let id = positional(parsed, 2).ok_or_else(|| usage("application id is required".to_string()))?;
      store.get_application(&id).map(|data| ("application.get".to_string(), data))
    }
    ("application", "add") => {
      let spec = new_application_from(parsed).map_err(usage)?;
      store.add_application(spec).map(|data| ("application.add".to_string(), data))
    }
    ("application", "update") => {
      let id = positional(parsed, 2).ok_or_else(|| usage("application id is required".to_string()))?;
      let patch = patch_from(parsed).map_err(usage)?;
      store.update_application(&id, patch).map(|data| ("application.update".to_string(), data))
    }
    ("application", "delete") => {
      let id = positional(parsed, 2).ok_or_else(|| usage("application id is required".to_string()))?;
      store.delete_application(&id).map(|data| ("application.delete".to_string(), data))
    }
    ("application", "search") => {
      let query = parsed.positionals.iter().skip(2).cloned().collect::<Vec<_>>().join(" ");
      store.search_applications(&query).map(|data| ("application.search".to_string(), data))
    }
    ("deadline", "upcoming") => {
      let days = optional_one(parsed, "days").map_err(usage)?;
      let days = match days {
        Some(days) => days.parse::<i64>().map_err(|_| usage("days must be a number".to_string()))?,
        None => 14,
      };
      store.upcoming_deadlines(days).map(|data| ("deadline.upcoming".to_string(), data))
    }
    ("deadline", "overdue") => store.overdue_deadlines().map(|data| ("deadline.overdue".to_string(), data)),
    ("export", "json") | ("export", "csv") => export_command(store, parsed, action),
    ("import", "") => return Err(usage("import path is required".to_string())),
    ("import", _) => {
      let path = positional(parsed, 1).ok_or_else(|| usage("import path is required".to_string()))?;
      import_command(store, &path, parsed.switches.contains_key("merge"))
    }
    ("backup", "create") => store.create_backup().map(|(path, timestamp)| {
      (
        "backup.create".to_string(),
        json!({ "path": path.to_string_lossy(), "timestamp": timestamp }),
      )
    }),
    ("backup", "list") => store.list_backups().map(|entries| {
      let backups: Vec<Value> = entries
        .into_iter()
        .map(|entry| json!({ "filename": entry.filename, "timestamp": entry.timestamp, "size": entry.size }))
        .collect();
      ("backup.list".to_string(), json!({ "count": backups.len(), "backups": backups }))
    }),
    ("backup", "restore") => {
      let filename = positional(parsed, 2).ok_or_else(|| usage("backup filename is required".to_string()))?;
      store.restore_backup_with_undo(&filename).map(|data| ("backup.restore".to_string(), data))
    }
    ("backup", "delete") => {
      let filename = positional(parsed, 2).ok_or_else(|| usage("backup filename is required".to_string()))?;
      store.delete_backup(&filename).map(|()| ("backup.delete".to_string(), json!({ "filename": filename })))
    }
    ("undo", "") => store.undo().map(|data| ("undo".to_string(), data)),
    ("redo", "") => store.redo().map(|data| ("redo".to_string(), data)),
    ("help", _) => return Ok(("help".to_string(), Value::Null)),
    _ => return Err(usage(format!("unknown command '{}'. Run academiatrack --help", parsed.positionals.join(" ")))),
  };
  result.map_err(fail)
}

fn export_command(store: &Store, parsed: &Parsed, format: &str) -> Result<(String, Value), String> {
  let output = optional_one(parsed, "output")?;
  if format == "csv" {
    let csv = store.export_csv()?;
    if let Some(path) = output {
      std::fs::write(&path, &csv).map_err(|error| error.to_string())?;
      return Ok((
        "export.csv".to_string(),
        json!({ "path": path, "bytes": csv.len() }),
      ));
    }
    return Ok(("export.csv".to_string(), json!({ "csv": csv })));
  }
  let document = store.export_document()?;
  if let Some(path) = output {
    let bytes = serde_json::to_vec_pretty(&document).map_err(|error| error.to_string())?;
    std::fs::write(&path, &bytes).map_err(|error| error.to_string())?;
    return Ok((
      "export.json".to_string(),
      json!({ "path": path, "bytes": bytes.len() }),
    ));
  }
  Ok(("export.json".to_string(), document))
}

fn import_command(store: &Store, path: &str, merge: bool) -> Result<(String, Value), String> {
  let text = std::fs::read_to_string(path).map_err(|error| format!("could not read {path}: {error}"))?;
  let value: Value = serde_json::from_str(&text).map_err(|_| format!("{path} is not valid JSON"))?;
  let records = if let Some(apps) = value.get("applications").and_then(|apps| apps.as_array()) {
    apps.clone()
  } else if let Some(apps) = value.as_array() {
    apps.clone()
  } else if value.get("universityName").is_some() {
    vec![value]
  } else {
    return Err(format!("{path} is not an application list or a data document"));
  };
  store.import_applications(records, merge).map(|data| ("import".to_string(), data))
}

fn new_application_from(parsed: &Parsed) -> Result<NewApplication, String> {
  let university = required_one(parsed, "university")?;
  let program = required_one(parsed, "program")?;
  if let Some(program_type) = optional_one(parsed, "program-type")? {
    canonical_program_type(&program_type)?;
  }
  if let Some(status) = optional_one(parsed, "status")? {
    canonical_status(&status)?;
  }
  Ok(NewApplication {
    id: optional_one(parsed, "id")?,
    university,
    program,
    program_type: optional_one(parsed, "program-type")?,
    department: optional_one(parsed, "department")?,
    location: optional_one(parsed, "location")?,
    status: optional_one(parsed, "status")?,
    deadline: optional_one(parsed, "deadline")?,
    portal: optional_one(parsed, "portal")?,
    notes: optional_one(parsed, "notes")?,
    fee: optional_fee(parsed)?,
    term: optional_one(parsed, "term")?,
    year: optional_one(parsed, "year")?,
    tags: parsed.values.get("tag").cloned().unwrap_or_default(),
  })
}

fn patch_from(parsed: &Parsed) -> Result<ApplicationPatch, String> {
  let mut patch = ApplicationPatch::default();
  patch.university = optional_one(parsed, "university")?;
  patch.program = optional_one(parsed, "program")?;
  patch.program_type = optional_one(parsed, "program-type")?;
  patch.department = optional_one(parsed, "department")?;
  patch.location = optional_one(parsed, "location")?;
  patch.status = optional_one(parsed, "status")?;
  patch.portal = optional_one(parsed, "portal")?;
  patch.notes = optional_one(parsed, "notes")?;
  patch.fee = optional_fee(parsed)?;
  patch.deadline = field_change(parsed, "deadline")?;
  patch.term = field_change(parsed, "term")?;
  patch.year = field_change(parsed, "year")?;
  patch.add_tags = parsed.values.get("tag").cloned().unwrap_or_default();
  patch.remove_tags = parsed.values.get("untag").cloned().unwrap_or_default();
  patch.pinned = optional_bool(parsed, "pinned")?;
  patch.fee_waiver = optional_one(parsed, "fee-waiver")?;
  patch.decision_deadline = field_change(parsed, "decision-deadline")?;
  patch.chance = optional_chance(parsed)?;
  patch.document = optional_one(parsed, "document")?;
  patch.document_status = optional_one(parsed, "document-status")?;
  patch.document_required = optional_bool(parsed, "document-required")?;
  if patch.document.is_none() && (patch.document_status.is_some() || patch.document_required.is_some()) {
    return Err("--document is required".to_string());
  }
  if patch.document.is_some() && patch.document_status.is_none() && patch.document_required.is_none() {
    return Err("--document needs --document-status or --document-required".to_string());
  }
  let untouched = patch.university.is_none()
    && patch.program.is_none()
    && patch.program_type.is_none()
    && patch.department.is_none()
    && patch.location.is_none()
    && patch.status.is_none()
    && patch.portal.is_none()
    && patch.notes.is_none()
    && patch.fee.is_none()
    && matches!(patch.deadline, FieldChange::Unchanged)
    && matches!(patch.term, FieldChange::Unchanged)
    && matches!(patch.year, FieldChange::Unchanged)
    && patch.pinned.is_none()
    && patch.add_tags.is_empty()
    && patch.remove_tags.is_empty()
    && patch.fee_waiver.is_none()
    && matches!(patch.decision_deadline, FieldChange::Unchanged)
    && matches!(patch.chance, FieldChange::Unchanged)
    && patch.document.is_none()
    && patch.document_status.is_none()
    && patch.document_required.is_none();
  if untouched {
    return Err("update needs at least one field to change".to_string());
  }
  Ok(patch)
}

fn field_change(parsed: &Parsed, name: &str) -> Result<FieldChange<String>, String> {
  match optional_one(parsed, name)? {
    None => Ok(FieldChange::Unchanged),
    Some(value) if matches!(value.to_lowercase().as_str(), "none" | "null" | "clear") => Ok(FieldChange::Clear),
    Some(value) => Ok(FieldChange::Set(value)),
  }
}

fn optional_chance(parsed: &Parsed) -> Result<FieldChange<f64>, String> {
  match optional_one(parsed, "chance")? {
    None => Ok(FieldChange::Unchanged),
    Some(value) if matches!(value.to_lowercase().as_str(), "none" | "null" | "clear") => Ok(FieldChange::Clear),
    Some(value) => value.parse::<f64>().map(FieldChange::Set).map_err(|_| "chance must be a number".to_string()),
  }
}

fn optional_bool(parsed: &Parsed, name: &str) -> Result<Option<bool>, String> {
  match optional_one(parsed, name)? {
    None => Ok(None),
    Some(value) => match value.to_lowercase().as_str() {
      "true" | "yes" | "1" => Ok(Some(true)),
      "false" | "no" | "0" => Ok(Some(false)),
      _ => Err(format!("{name} must be true or false")),
    },
  }
}

fn optional_fee(parsed: &Parsed) -> Result<Option<f64>, String> {
  match optional_one(parsed, "fee")? {
    None => Ok(None),
    Some(fee) => fee.parse::<f64>().map(Some).map_err(|_| "fee must be a number".to_string()),
  }
}

fn optional_limit(parsed: &Parsed) -> Result<Option<usize>, String> {
  match optional_one(parsed, "limit")? {
    None => Ok(None),
    Some(limit) => {
      let limit: usize = limit.parse().map_err(|_| "limit must be a number".to_string())?;
      if limit > 10_000 {
        return Err("limit must be at most 10000".to_string());
      }
      Ok(Some(limit))
    }
  }
}

fn required_one(parsed: &Parsed, name: &str) -> Result<String, String> {
  optional_one(parsed, name)?.ok_or_else(|| format!("--{name} is required"))
}

fn optional_one(parsed: &Parsed, name: &str) -> Result<Option<String>, String> {
  match parsed.values.get(name) {
    None => Ok(None),
    Some(values) if values.len() == 1 => Ok(Some(values[0].clone())),
    Some(_) => Err(format!("--{name} was given more than once")),
  }
}

fn positional(parsed: &Parsed, index: usize) -> Option<String> {
  parsed.positionals.get(index).cloned()
}

fn command_name(parsed: &Parsed) -> String {
  match parsed.positionals.first().map(String::as_str) {
    Some("application") => format!("application.{}", parsed.positionals.get(1).map(String::as_str).unwrap_or("")),
    Some("deadline") => format!("deadline.{}", parsed.positionals.get(1).map(String::as_str).unwrap_or("")),
    Some("backup") => format!("backup.{}", parsed.positionals.get(1).map(String::as_str).unwrap_or("")),
    Some("export") => format!("export.{}", parsed.positionals.get(1).map(String::as_str).unwrap_or("")),
    Some(command) => command.to_string(),
    None => String::new(),
  }
}

fn parse_args(args: &[String]) -> Result<Parsed, String> {
  let value_flags = [
    "data-dir",
    "status",
    "limit",
    "university",
    "program",
    "id",
    "department",
    "location",
    "program-type",
    "deadline",
    "portal",
    "notes",
    "fee",
    "term",
    "year",
    "tag",
    "untag",
    "pinned",
    "fee-waiver",
    "decision-deadline",
    "chance",
    "document",
    "document-status",
    "document-required",
    "days",
    "output",
  ];
  let repeatable = ["tag", "untag"];
  let mut parsed = Parsed {
    json: false,
    data_dir: None,
    help: false,
    version: false,
    positionals: Vec::new(),
    values: HashMap::new(),
    switches: HashMap::new(),
  };
  let mut index = 0;
  while index < args.len() {
    let arg = &args[index];
    if arg == "--" {
      parsed.positionals.extend(args[index + 1..].iter().cloned());
      break;
    }
    if arg == "--json" {
      parsed.json = true;
    } else if arg == "--help" || arg == "-h" || arg == "help" && parsed.positionals.is_empty() {
      parsed.help = true;
    } else if arg == "--version" || arg == "-V" {
      parsed.version = true;
    } else if arg == "--merge" {
      parsed.switches.insert("merge".to_string(), true);
    } else if let Some(name) = arg.strip_prefix("--") {
      if !value_flags.contains(&name) {
        return Err(format!("unknown flag --{name}"));
      }
      let Some(value) = args.get(index + 1) else {
        return Err(format!("--{name} needs a value"));
      };
      if value.starts_with("--") {
        return Err(format!("--{name} needs a value"));
      }
      index += 1;
      if name == "data-dir" {
        if parsed.data_dir.is_some() {
          return Err("--data-dir was given more than once".to_string());
        }
        parsed.data_dir = Some(PathBuf::from(value));
      } else if name == "output" {
        push_value(&mut parsed, "output", value, false)?;
      } else {
        push_value(&mut parsed, name, value, repeatable.contains(&name))?;
      }
    } else if let Some(path) = arg.strip_prefix("-o") {
      let value = if path.is_empty() {
        let Some(value) = args.get(index + 1) else {
          return Err("-o needs a value".to_string());
        };
        index += 1;
        value.clone()
      } else {
        path.to_string()
      };
      push_value(&mut parsed, "output", &value, false)?;
    } else {
      parsed.positionals.push(arg.clone());
    }
    index += 1;
  }
  Ok(parsed)
}

fn push_value(parsed: &mut Parsed, name: &str, value: &str, repeatable: bool) -> Result<(), String> {
  let entry = parsed.values.entry(name.to_string()).or_default();
  if !repeatable && !entry.is_empty() {
    return Err(format!("--{name} was given more than once"));
  }
  entry.push(value.to_string());
  Ok(())
}

fn render_success(json_mode: bool, command: &str, data: Value) -> Output {
  if json_mode {
    let body = json!({ "ok": true, "command": command, "data": data });
    return Output {
      code: 0,
      stdout: format!("{body}\n"),
      stderr: String::new(),
    };
  }
  Output {
    code: 0,
    stdout: format!("{}\n", human(command, &data)),
    stderr: String::new(),
  }
}

fn render_failure(failure: &Failure, json_mode: bool) -> Output {
  if json_mode {
    let body = json!({ "ok": false, "command": failure.command, "error": failure.message });
    return Output {
      code: failure.code,
      stdout: format!("{body}\n"),
      stderr: String::new(),
    };
  }
  Output {
    code: failure.code,
    stdout: String::new(),
    stderr: format!("{}\n", failure.message),
  }
}

fn human(command: &str, data: &Value) -> String {
  match command {
    "status" => {
      format!(
        "data: {}\napplications: {}\nversion: {}\nwritable: {}",
        data["data_file"].as_str().unwrap_or(""),
        data["applications"],
        data["version"],
        data["writable"]
      )
    }
    "application.list" | "application.search" => {
      let mut lines = vec![format!("{} application(s)", data["count"].as_u64().unwrap_or(0))];
      if let Some(apps) = data["applications"].as_array() {
        for app in apps {
          lines.push(format!(
            "{}  {}  {}  {}  {}",
            app["id"].as_str().unwrap_or(""),
            app["universityName"].as_str().unwrap_or(""),
            app["programName"].as_str().unwrap_or(""),
            app["status"].as_str().unwrap_or(""),
            app["deadline"].as_str().unwrap_or("")
          ));
        }
      }
      lines.join("\n")
    }
    "application.add" | "application.get" | "application.update" => format!(
      "{}  {}  {}  {}",
      data["id"].as_str().unwrap_or(""),
      data["universityName"].as_str().unwrap_or(""),
      data["programName"].as_str().unwrap_or(""),
      data["status"].as_str().unwrap_or("")
    ),
    "application.delete" => format!("deleted {} ({})", data["deleted"], data["id"].as_str().unwrap_or("")),
    "deadline.upcoming" | "deadline.overdue" => {
      let mut lines = vec![format!("{} deadline(s)", data["count"].as_u64().unwrap_or(0))];
      if let Some(rows) = data["deadlines"].as_array() {
        for row in rows {
          lines.push(format!(
            "{}  {}  {}  {}  {}d",
            row["id"].as_str().unwrap_or(""),
            row["universityName"].as_str().unwrap_or(""),
            row["programName"].as_str().unwrap_or(""),
            row["deadline"].as_str().unwrap_or(""),
            row["days"].as_i64().unwrap_or(0)
          ));
        }
      }
      lines.join("\n")
    }
    "export.csv" => data["path"].as_str().map(|path| format!("wrote {path}")).unwrap_or_else(|| data["csv"].as_str().unwrap_or("").to_string()),
    "export.json" => data["path"]
      .as_str()
      .map(|path| format!("wrote {path}"))
      .unwrap_or_else(|| serde_json::to_string_pretty(data).unwrap_or_default()),
    "import" => format!("imported {} (total {})", data["imported"], data["total"]),
    "backup.create" => format!("backup {}", data["path"].as_str().unwrap_or("")),
    "backup.list" => {
      let mut lines = vec![format!("{} backup(s)", data["count"].as_u64().unwrap_or(0))];
      if let Some(backups) = data["backups"].as_array() {
        for backup in backups {
          lines.push(format!("{}  {} bytes", backup["filename"].as_str().unwrap_or(""), backup["size"]));
        }
      }
      lines.join("\n")
    }
    "backup.delete" => format!("deleted backup {}", data["filename"].as_str().unwrap_or("")),
    "undo" | "redo" => format!("{} ({} applications)", command, data["applications"]),
    "help" => HELP.trim_end().to_string(),
    _ => serde_json::to_string_pretty(data).unwrap_or_default(),
  }
}

fn args_request_json(args: &[String]) -> bool {
  args.iter().any(|arg| arg == "--json")
}

pub fn split_line(line: &str) -> Result<Vec<String>, String> {
  let mut out = Vec::new();
  let mut current = String::new();
  let mut in_token = false;
  let mut in_quote = false;
  let mut chars = line.chars().peekable();
  while let Some(ch) = chars.next() {
    if ch == '\\' {
      match chars.next() {
        Some(next) => {
          current.push(next);
          in_token = true;
        }
        None => return Err("trailing backslash".to_string()),
      }
      continue;
    }
    if ch == '"' {
      in_quote = !in_quote;
      in_token = true;
      continue;
    }
    if ch.is_whitespace() && !in_quote {
      if in_token {
        out.push(std::mem::take(&mut current));
        in_token = false;
      }
      continue;
    }
    current.push(ch);
    in_token = true;
  }
  if in_quote {
    return Err("unclosed quote".to_string());
  }
  if in_token {
    out.push(current);
  }
  Ok(out)
}

#[cfg(test)]
mod tests {
  use super::*;
  use std::fs;
  use std::sync::atomic::{AtomicU64, Ordering};

  static TEMP_SEQ: AtomicU64 = AtomicU64::new(0);

  fn temp_dir() -> PathBuf {
    let n = TEMP_SEQ.fetch_add(1, Ordering::Relaxed);
    let path = std::env::temp_dir().join(format!("academiatrack-cli-{}-{}", std::process::id(), n));
    fs::create_dir_all(&path).unwrap();
    path
  }

  fn args(dir: &std::path::Path, parts: &[&str]) -> Vec<String> {
    let mut out = vec!["--data-dir".to_string(), dir.to_string_lossy().into_owned()];
    out.extend(parts.iter().map(|part| (*part).to_string()));
    out
  }

  #[test]
  fn help_and_unknown_command() {
    let help = execute(&["--help".to_string()]);
    assert_eq!(help.code, 0);
    assert!(help.stdout.contains("application add"));
    let unknown = execute(&["--json".to_string(), "nope".to_string()]);
    assert_eq!(unknown.code, 2);
    let body: Value = serde_json::from_str(unknown.stdout.trim()).unwrap();
    assert_eq!(body["ok"], false);
  }

  #[test]
  fn add_list_update_search_round_trip_in_json() {
    let dir = temp_dir();
    let added = execute(&args(&dir, &["--json", "application", "add", "--university", "MIT", "--program", "EECS PhD", "--deadline", "2026-12-01"]));
    assert_eq!(added.code, 0, "{}", added.stdout);
    let body: Value = serde_json::from_str(added.stdout.trim()).unwrap();
    let id = body["data"]["id"].as_str().unwrap().to_string();
    assert_eq!(body["data"]["documents"]["cv"]["status"], "Not Started");

    let updated = execute(&args(&dir, &["--json", "application", "update", &id, "--status", "submitted"]));
    assert_eq!(updated.code, 0, "{}", updated.stderr);
    let body: Value = serde_json::from_str(updated.stdout.trim()).unwrap();
    assert_eq!(body["data"]["status"], "Submitted");

    let listed = execute(&args(&dir, &["--json", "application", "list", "--status", "Submitted"]));
    let body: Value = serde_json::from_str(listed.stdout.trim()).unwrap();
    assert_eq!(body["data"]["count"], 1);

    let found = execute(&args(&dir, &["--json", "application", "search", "eecs"]));
    let body: Value = serde_json::from_str(found.stdout.trim()).unwrap();
    assert_eq!(body["data"]["count"], 1);
    let _ = fs::remove_dir_all(dir);
  }

  #[test]
  fn missing_university_is_usage_and_does_not_touch_default_store() {
    let dir = temp_dir();
    let output = execute(&args(&dir, &["--json", "application", "add", "--program", "CS"]));
    assert_eq!(output.code, 2);
    let body: Value = serde_json::from_str(output.stdout.trim()).unwrap();
    assert!(body["error"].as_str().unwrap().contains("university"));
    assert!(!dir.join("data.json").exists());
    let _ = fs::remove_dir_all(dir);
  }

  #[test]
  fn split_line_keeps_quoted_spaces() {
    assert_eq!(split_line(r#"search "carnegie mellon""#).unwrap(), vec!["search", "carnegie mellon"]);
  }

  #[test]
  fn update_sets_fee_waiver_chance_and_one_document() {
    let dir = temp_dir();
    let added = execute(&args(&dir, &["--json", "application", "add", "--university", "Yale", "--program", "CS"]));
    assert_eq!(added.code, 0, "{}", added.stdout);
    let body: Value = serde_json::from_str(added.stdout.trim()).unwrap();
    let id = body["data"]["id"].as_str().unwrap().to_string();
    let updated = execute(&args(
      &dir,
      &[
        "--json",
        "application",
        "update",
        &id,
        "--fee-waiver",
        "granted",
        "--decision-deadline",
        "2030-04-15",
        "--chance",
        "40",
        "--document",
        "sop",
        "--document-status",
        "ready to submit",
        "--document-required",
        "true",
      ],
    ));
    assert_eq!(updated.code, 0, "{}{}", updated.stdout, updated.stderr);
    let body: Value = serde_json::from_str(updated.stdout.trim()).unwrap();
    assert_eq!(body["data"]["feeWaiverStatus"], "Granted");
    assert_eq!(body["data"]["decisionDeadline"], "2030-04-15");
    assert_eq!(body["data"]["admissionChance"], 40);
    assert_eq!(body["data"]["documents"]["statementOfPurpose"]["status"], "Ready to Submit");
    assert_eq!(body["data"]["documents"]["statementOfPurpose"]["required"], true);
    let bare = execute(&args(&dir, &["--json", "application", "update", &id, "--document", "cv"]));
    assert_eq!(bare.code, 2, "{}", bare.stdout);
    let _ = fs::remove_dir_all(dir);
  }
}
