# Android offline review and device sync

Version `0.3.0-alpha` supports one PC and one Android device. After the first sync,
the phone can review text, images, and audio while the PC is off. Review events
remain in an encrypted outbox and are uploaded when the user-selected connection
is available again.

The Android client requires Android 7.0 / API 24 or newer. Capacitor 8 no longer
supports API 23. The package id is `io.github.yaqxuan.contextvocabularynotebook`.

## Install the Android app

Download the APK and matching `.sha256` file from the GitHub Release. Verify the
checksum before installing. Pull requests and unsigned tag builds expose a debug
APK only as a short-lived GitHub Actions artifact; they are not public releases.

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
3. Create a five-minute pairing QR code.
4. Scan it on Android and confirm the displayed device name on the PC.
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
Run the displayed command yourself:

```bash
tailscale serve --bg 3108
```

Save the resulting MagicDNS `https://...ts.net` URL in Settings, create the pairing
QR, and select **Tailscale** on Android. Do not enable Funnel. Tailnet ACLs and the
app credential are both required; failure in either layer does not fall back to
LAN or plaintext HTTP.

## Sync behavior

Each sync validates protocol compatibility, uploads continuous event batches,
replays affected cards on the PC, atomically replaces the phone's text snapshot,
downloads missing image/audio hashes with Range resume, and acknowledges the
revision. Video metadata is retained but original video is not copied offline.

The phone syncs at startup, when returning to the foreground, or when **Sync now**
is pressed. It does not schedule Android background work. Switching LAN/Tailscale
keeps the same device identity, event outbox, snapshot revision, and media cache.

## Build locally

Use Node.js 22, Java 21, and Android SDK Platform 36:

```bash
npm ci
npm run android:sync
cd android
./gradlew testDebugUnitTest assembleDebug
```

The APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`.
