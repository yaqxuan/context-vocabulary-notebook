# Android offline review and device sync

Version `0.3.0-alpha.6` supports one PC and one Android device. After the first sync,
the phone can review text, images, and audio while the PC is off. Review events
remain in an encrypted outbox and are uploaded when the user-selected connection
is available again.

The Android client requires Android 7.0 / API 24 or newer. Capacitor 8 no longer
supports API 23. The package id is `io.github.yaqxuan.contextvocabularynotebook`.

## Install the Android app

For a signed release, download the APK and matching `.sha256` file from the GitHub
Release. Before a signed release exists, open the relevant **Android APK** workflow run,
scroll to **Artifacts**, download `cvn-android-...`, and extract the ZIP. It contains:

- `app-debug.apk`: the Android installer; this is the file to send to the phone.
- `app-debug.apk.sha256`: the expected checksum; keep it on the computer for verification.

Verify the Debug APK on Windows PowerShell before transferring it:

```powershell
$expected = (Get-Content .\app-debug.apk.sha256).Split()[0].ToLowerInvariant()
$actual = (Get-FileHash .\app-debug.apk -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actual -ne $expected) { throw "APK checksum mismatch" }
```

After the values match, send only `app-debug.apk` to the phone by USB, Nearby Share,
or another file-transfer method. Open it on the phone and allow that file manager to
install unknown apps if Android asks. Disable that permission again after installation.
Debug APKs are test builds rather than public releases, and Android may show an extra
warning. Never install the APK when the checksum does not match.

Before replacing an older test build, sync until **Pending upload** is zero. If Android
reports an incompatible signature, uninstall the old Debug APK and install the new one;
uninstalling deletes the phone replica, so confirm the outbox is empty first.

Pull requests and unsigned tag builds expose the Debug APK only as a short-lived
GitHub Actions artifact; they do not create a public Release.

The release workflow requires these repository secrets and never stores them in
the repository or an artifact:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

## Enable the PC sync service

Set the feature flag and restart the PC app:

```env
CVN_DEVICE_SYNC=1
```

The regular browser app and API remain on localhost. Device sync uses a separate,
restricted `/v1` service. It never exposes card editing, AI configuration, API
keys, imports, exports, or the general media API.

Open **Settings → Android offline sync**. The first pairing creates a long-lived
P-256 PC identity and a self-signed certificate under `data/sync-identity/` by
default. Do not copy this identity between PCs. Losing or rotating it requires
pairing again.

## Local network mode

1. In PC Settings, enable Local network sync and restart the app.
2. Allow TCP `3109` through the firewall only on trusted/private networks.
3. Create a compact five-minute pairing QR code.
4. Scan it on Android and confirm the displayed device name on the PC. If scanning
   is unavailable, copy the **pairing text** shown below the QR directly to the
   phone; do not upload the one-time secret to a third-party QR decoder.
5. Keep **Local network** selected on the phone.

The PC publishes `_cvn-sync._tcp.local` with mDNS. Discovery is only a routing
hint: Android always checks the exact saved SHA-256 SPKI fingerprint. If mDNS is
unavailable, the app uses the address saved from the QR code or a manually entered
address. IP changes do not require pairing again; a certificate identity change
does.

On Android 13 or newer, allow the **Nearby devices** permission when LAN mode
first performs discovery. Tailscale mode does not use mDNS. Android 16 still
grants local-network access implicitly to this target-SDK-36 build; the manifest
and runtime prompt also prepare the app for Android 16's optional restriction.

Firewall examples (adapt the profile/interface to your environment):

```powershell
New-NetFirewallRule -DisplayName "CVN device sync" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3109 -Profile Private
```

```bash
sudo ufw allow from 192.168.0.0/16 to any port 3109 proto tcp
```

On macOS, allow the Node.js application when the system firewall prompts. Do not
disable the whole firewall on any platform.

### Windows 11 WSL

Mirrored networking is the supported WSL configuration because it provides LAN
reachability and multicast. The Settings page reports the detected mode and shows
an exact Hyper-V firewall command without running it. Microsoft documents the
mode and firewall behavior in [Accessing network applications with WSL](https://learn.microsoft.com/windows/wsl/networking).

For NAT mode, mDNS and direct LAN access are not supported. Manual troubleshooting
can use Windows `netsh interface portproxy` plus a scoped Windows firewall rule,
but the address must be updated when the WSL address changes. Prefer mirrored
mode instead of treating this as a permanent setup.

## Tailscale mode

The Settings page only detects Tailscale; it never changes system configuration.
Under WSL it checks both a Linux CLI and `tailscale.exe` exposed by Windows through
WSL interop. Run the displayed command yourself:

```bash
tailscale serve --bg 3108
```

Save the resulting MagicDNS `https://...ts.net` URL in Settings, create the pairing
QR, and select **Tailscale** on Android. Do not enable Funnel. Tailnet ACLs and the
app credential are both required; failure in either layer does not fall back to
LAN or plaintext HTTP.

## Sync behavior

Each sync validates protocol and minimum-client compatibility, uploads continuous
review-event batches followed by idempotent favorite/mastered action batches,
replays affected cards on the PC, atomically replaces the phone's text snapshot,
downloads missing image/audio/video hashes with Range resume, and acknowledges
the revision. Video files are stored in the same private hash-addressed cache and
play after a rating reveals the answer. When a context has video but no separate
audio attachment, the PC also generates a small AAC fallback track.

After choosing a rating and revealing the answer, favorite/unfavorite and
**Mark mastered** also work offline. Correcting `Good` to `Again` records `Again`
and immediately advances; an initial `Again` still pauses on the answer until it
is confirmed. Marking mastered records the pending rating and removes the card
from the active phone queue in one local transaction.

The phone syncs at startup, when returning to the foreground, or when **Sync now**
is pressed. The button uploads offline reviews and card actions, refreshes the
canonical PC snapshot, and downloads missing media. It does not schedule Android
background work. Switching LAN/Tailscale keeps the same device identity, both
outboxes, snapshot revision, and media cache.

The first pairing must finish a complete PC snapshot before review or learning-language
selection is enabled. The phone then follows the PC learning language by default. You can
choose any language represented by active cards, even while offline; that phone-only choice
survives restarts and is not written to PC Settings. Reviews, favorite changes, and mastered
actions from every language remain in their outboxes and upload before the next snapshot.
If the PC default language changes, the next sync clears the phone override and follows the
new PC language. **Today** is counted for the current phone language, while **Pending upload**
always covers every language.

The Android interface is independent of the learning language and is available in Chinese,
English, Japanese, Korean, French, German, Spanish, and Russian before and after pairing.

## Build locally

Use Node.js 22, Java 21, and Android SDK Platform 36:

```bash
npm ci
npm run android:sync
cd android
./gradlew testDebugUnitTest assembleDebug
```

The APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`.
