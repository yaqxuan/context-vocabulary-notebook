/**
 * File.toURI() on Android produces `file:/data/...`, while Capacitor only
 * recognizes absolute paths or `file://` URLs in convertFileSrc(). Normalize
 * already-cached values so an app update fixes playback without redownloading.
 */
export function normalizeNativeMediaPath(value: string): string {
  return /^file:\/(?!\/)/u.test(value) ? value.slice('file:'.length) : value;
}
