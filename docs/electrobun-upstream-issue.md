# Title

Windows packaging in `electrobun@1.15.1` uses a broken `rcedit` path and fragile PowerShell archive invocation

# Summary

`electrobun@1.15.1` fails during Windows packaging in two separate places:

1. the packaged CLI binary tries to execute `rcedit` from a baked CI path that does not exist on end-user machines
2. archive creation/extraction uses `powershell -command` without `-NoProfile` and without explicitly importing `Microsoft.PowerShell.Archive`, which breaks under restricted execution policy

# Environment

- Electrobun: `1.15.1`
- OS: Windows 11
- Bun: `1.3.8`
- Invocation used for repro: `electrobun build --env=stable` and `bun run package`

# Problem 1: broken `rcedit` runtime path

## Actual behavior

During Windows packaging, Electrobun attempts to execute `rcedit` from a path similar to:

`D:\a\electrobun\electrobun\package\node_modules\rcedit\bin\rcedit-x64.exe`

That path only makes sense inside the upstream CI/build environment. On a local machine, it does not exist, so icon embedding fails for:

- `launcher.exe`
- `bun.exe`
- the generated Windows installer

## Expected behavior

Electrobun should resolve `rcedit` from the installed package location at runtime, or vendor it in a package-relative location that is valid after install.

# Problem 2: fragile PowerShell archive invocation

## Actual behavior

Electrobun invokes Windows archive commands through `powershell -command` for `Expand-Archive` and `Compress-Archive`.

On machines with restricted execution policy:

- PowerShell tries to load user profile scripts first
- profile loading fails
- `Microsoft.PowerShell.Archive` does not autoload cleanly
- packaging aborts on `Compress-Archive` or `Expand-Archive`

## Expected behavior

Electrobun should invoke PowerShell in a non-profile mode and import the archive module explicitly, for example:

`powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -command "Import-Module Microsoft.PowerShell.Archive; ..."`

# Repro

1. Install dependencies on Windows with `electrobun@1.15.1`.
2. Configure a Windows icon in `electrobun.config.ts`.
3. Run `bun run package` or `electrobun build --env=stable`.
4. Observe icon embedding failures and/or archive step failures.

# Local workaround currently used

This repo currently carries a `patch-package` patch against `electrobun@1.15.1` that:

- hardens the PowerShell archive command invocation
- injects a temporary local shim so the broken `rcedit` path resolves during Windows packaging

The workaround is effective, but it is downstream-only and version-fragile. The root fix needs to be in Electrobun itself so consumers do not need to patch the package after install.
