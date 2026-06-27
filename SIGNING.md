# Code Signing & Notarization

AcademiaTrack ships desktop installers through GitHub Releases. When a binary is
**not** signed by a recognized authority, the operating system and browsers warn
the person trying to install it:

| Symptom the user sees | Cause |
|-----------------------|-------|
| macOS: *"AcademiaTrack can't be opened because Apple cannot check it for malicious software"* | The `.app` is ad-hoc signed (no Apple **Developer ID** + notarization). |
| macOS: *"AcademiaTrack is damaged and can't be opened"* after download | Same — quarantine + missing notarization ticket. |
| Chrome / Edge: *"This file isn't commonly downloaded and may be dangerous"* | Download has no signature reputation (Google Safe Browsing / SmartScreen). |
| Windows: *"Windows protected your PC"* (SmartScreen) | The `.exe`/`.msi` has no **Authenticode** signature. |

> These are reputation/trust warnings, not bugs in the app. They disappear only
> when the installer is signed with a certificate the platform trusts. The build
> pipeline is already wired to sign automatically — it just needs the
> certificates supplied as repository secrets. Until then, builds are produced
> **ad-hoc signed** (functional, but warned about).

The "iOS" warning some users mention is the same Apple trust system: macOS
Gatekeeper and iOS share the notarization/Developer-ID infrastructure. There is
no iOS build target in this project today; the fix below covers the macOS
desktop app.

---

## 1. macOS — Developer ID signing + notarization (fixes the Apple & Chrome warnings)

**Requirements:** an [Apple Developer Program](https://developer.apple.com/programs/)
membership ($99/yr). From it you create a **Developer ID Application**
certificate and an app-specific password for notarization.

### One-time setup

1. **Create the certificate** (Xcode → Settings → Accounts → Manage
   Certificates → `+` → *Developer ID Application*), or via the Apple Developer
   portal. Export it from Keychain Access as a `.p12` (this includes the private
   key) and set an export password.

2. **Base64-encode the `.p12`** so it can live in a secret:
   ```bash
   base64 -i DeveloperID_Application.p12 | pbcopy
   ```

3. **Find your signing identity and Team ID:**
   ```bash
   security find-identity -v -p codesigning
   # e.g. "Developer ID Application: Your Name (ABCDE12345)"
   ```
   The 10-character code in parentheses is your **Team ID**.

4. **Create an app-specific password** for notarization at
   <https://appleid.apple.com> → Sign-In and Security → App-Specific Passwords.

### Add these GitHub repository secrets

`Settings → Secrets and variables → Actions → New repository secret`

| Secret | Value |
|--------|-------|
| `APPLE_CERTIFICATE` | base64 of the `.p12` (step 2) |
| `APPLE_CERTIFICATE_PASSWORD` | the `.p12` export password |
| `APPLE_SIGNING_IDENTITY` | e.g. `Developer ID Application: Your Name (ABCDE12345)` |
| `APPLE_ID` | your Apple ID email |
| `APPLE_PASSWORD` | the app-specific password (step 4) |
| `APPLE_TEAM_ID` | your 10-char Team ID |
| `KEYCHAIN_PASSWORD` | any non-empty random string (locks the CI keychain) |

That's it. The next release run will sign the universal bundle with your
Developer ID, notarize it with Apple, and staple the ticket —
`scripts/import-apple-cert.sh` imports the cert and Tauri does the rest. No
workflow edits needed.

### Verify a signed build

```bash
spctl -a -vvv -t exec /Applications/AcademiaTrack.app   # should say: accepted, source=Notarized Developer ID
codesign -dvvv /Applications/AcademiaTrack.app          # TeamIdentifier should be your Team ID, not "not set"
```

---

## 2. Windows — Authenticode signing (fixes SmartScreen / Chrome on Windows)

**Requirements:** a code-signing certificate from a CA (DigiCert, Sectigo, etc.).
An **OV** cert reduces warnings and builds reputation over time; an **EV** cert
clears SmartScreen immediately.

Once you have the cert installed on the build machine (or as a secret), set it in
`src-tauri/tauri.conf.json` under `bundle.windows`:

```jsonc
"windows": {
  "certificateThumbprint": "<THUMBPRINT>",
  "digestAlgorithm": "sha256",
  "timestampUrl": "http://timestamp.digicert.com"
}
```

For CI signing with a cloud HSM / Azure Trusted Signing, see the Tauri Windows
signing guide: <https://v2.tauri.app/distribute/sign/windows/>.

---

## What happens without certificates

The pipeline is intentionally fork-friendly: with none of the secrets above,
`scripts/import-apple-cert.sh` no-ops and the macOS build is produced
**ad-hoc signed**. It still installs (users right-click → Open on macOS, or
"Keep" in Chrome), but the trust warnings remain until certificates are added.

References:
- Tauri macOS signing — <https://v2.tauri.app/distribute/sign/macos/>
- Apple notarization — <https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution>
