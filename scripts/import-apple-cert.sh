#!/usr/bin/env bash
#
# Imports an Apple "Developer ID Application" certificate into a throwaway
# keychain so `tauri build` can sign the macOS bundle. Invoked by the macOS
# leg of .github/workflows/release.yml.
#
# It is intentionally a no-op when APPLE_CERTIFICATE is empty: forks and
# unconfigured repos still produce an (ad-hoc signed) build instead of failing
# the workflow. To turn on real signing + notarization, add the secrets listed
# in SIGNING.md.
#
# Expected environment:
#   APPLE_CERTIFICATE           base64 of the exported .p12 (cert + private key)
#   APPLE_CERTIFICATE_PASSWORD  password protecting the .p12
#   KEYCHAIN_PASSWORD           any non-empty string; locks the temp keychain
#
set -euo pipefail

if [[ "${RUNNER_OS:-}" != "macOS" && "$(uname -s)" != "Darwin" ]]; then
  echo "Not running on macOS; skipping certificate import."
  exit 0
fi

if [[ -z "${APPLE_CERTIFICATE:-}" ]]; then
  echo "APPLE_CERTIFICATE secret is not set; building without a Developer ID identity."
  echo "The bundle will be ad-hoc signed and will trip Gatekeeper / Chrome warnings."
  echo "See SIGNING.md to enable signed, notarized builds."
  exit 0
fi

KEYCHAIN_PASSWORD="${KEYCHAIN_PASSWORD:-academiatrack-ci}"
KEYCHAIN_PATH="${RUNNER_TEMP:-/tmp}/academiatrack-signing.keychain-db"
CERT_PATH="${RUNNER_TEMP:-/tmp}/academiatrack-cert.p12"

echo "Decoding certificate..."
echo -n "${APPLE_CERTIFICATE}" | base64 --decode > "${CERT_PATH}"

echo "Creating temporary keychain..."
security create-keychain -p "${KEYCHAIN_PASSWORD}" "${KEYCHAIN_PATH}"
security set-keychain-settings -lut 21600 "${KEYCHAIN_PATH}"
security unlock-keychain -p "${KEYCHAIN_PASSWORD}" "${KEYCHAIN_PATH}"

echo "Importing certificate..."
security import "${CERT_PATH}" \
  -P "${APPLE_CERTIFICATE_PASSWORD:-}" \
  -A -t cert -f pkcs12 \
  -k "${KEYCHAIN_PATH}"

# Allow codesign to use the key without an interactive prompt.
security set-key-partition-list \
  -S apple-tool:,apple:,codesign: \
  -s -k "${KEYCHAIN_PASSWORD}" "${KEYCHAIN_PATH}" >/dev/null

# Put our keychain first on the search list so codesign finds the identity.
security list-keychains -d user -s "${KEYCHAIN_PATH}" login.keychain-db

echo "Available signing identities:"
security find-identity -v -p codesigning "${KEYCHAIN_PATH}"

rm -f "${CERT_PATH}"
echo "Certificate import complete."
