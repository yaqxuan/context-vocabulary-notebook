package io.github.yaqxuan.contextvocabularynotebook;

import android.annotation.SuppressLint;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.KeyFactory;
import java.security.Signature;
import java.security.cert.X509Certificate;
import java.security.spec.X509EncodedKeySpec;
import java.util.Iterator;
import java.util.HashSet;
import java.util.Set;

import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;

@CapacitorPlugin(name = "PinnedHttp")
public class PinnedHttpPlugin extends Plugin {
    @SuppressLint("CustomX509TrustManager")
    private HttpsURLConnection openConnection(String rawUrl, String pin) throws Exception {
        URL url = new URL(rawUrl);
        if (!"https".equalsIgnoreCase(url.getProtocol())) throw new SecurityException("Only HTTPS sync URLs are allowed");
        HttpsURLConnection connection = (HttpsURLConnection) url.openConnection();
        connection.setConnectTimeout(10000);
        connection.setReadTimeout(30000);
        connection.setInstanceFollowRedirects(false);
        if (pin != null && !pin.isEmpty()) {
            X509TrustManager pinnedTrust = new X509TrustManager() {
                @Override public X509Certificate[] getAcceptedIssuers() { return new X509Certificate[0]; }
                @Override public void checkClientTrusted(X509Certificate[] chain, String authType) { throw new SecurityException("Client certificates are not accepted"); }
                @Override public void checkServerTrusted(X509Certificate[] chain, String authType) throws java.security.cert.CertificateException {
                    if (chain == null || chain.length == 0) throw new java.security.cert.CertificateException("Server certificate is missing");
                    try {
                        chain[0].checkValidity();
                        byte[] spki = chain[0].getPublicKey().getEncoded();
                        String actual = Base64.encodeToString(MessageDigest.getInstance("SHA-256").digest(spki), Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING);
                        if (!MessageDigest.isEqual(actual.getBytes(StandardCharsets.US_ASCII), pin.getBytes(StandardCharsets.US_ASCII))) {
                            throw new java.security.cert.CertificateException("Pinned server identity does not match");
                        }
                    } catch (java.security.cert.CertificateException error) {
                        throw error;
                    } catch (Exception error) {
                        throw new java.security.cert.CertificateException("Unable to verify pinned server identity", error);
                    }
                }
            };
            SSLContext context = SSLContext.getInstance("TLS");
            context.init(null, new TrustManager[]{pinnedTrust}, null);
            connection.setSSLSocketFactory(context.getSocketFactory());
            connection.setHostnameVerifier((hostname, session) -> true);
        }
        return connection;
    }

    private void applyHeaders(HttpsURLConnection connection, JSObject headers) {
        if (headers == null) return;
        Iterator<String> keys = headers.keys();
        while (keys.hasNext()) {
            String key = keys.next();
            String value = headers.optString(key, null);
            if (value != null) connection.setRequestProperty(key, value);
        }
    }

    private static byte[] readAll(InputStream stream) throws Exception {
        if (stream == null) return new byte[0];
        try (InputStream input = stream; ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[16384];
            int count;
            while ((count = input.read(buffer)) >= 0) output.write(buffer, 0, count);
            return output.toByteArray();
        }
    }

    private static String safeMediaSuffix(String fileName) {
        if (fileName == null) return "";
        String baseName = new File(fileName).getName();
        int dot = baseName.lastIndexOf('.');
        if (dot < 0 || dot == baseName.length() - 1) return "";
        String suffix = baseName.substring(dot).toLowerCase(java.util.Locale.ROOT);
        return suffix.matches("\\.[a-z0-9]{1,10}") ? suffix : "";
    }

    @PluginMethod
    public void request(PluginCall call) {
        getBridge().executeOnMainThread(() -> new Thread(() -> {
            try {
                String url = call.getString("url");
                if (url == null) throw new IllegalArgumentException("url is required");
                HttpsURLConnection connection = openConnection(url, call.getString("spkiSha256"));
                String method = call.getString("method", "GET").toUpperCase(java.util.Locale.ROOT);
                connection.setRequestMethod(method);
                applyHeaders(connection, call.getObject("headers", new JSObject()));
                String body = call.getString("body");
                if (body != null) {
                    connection.setDoOutput(true);
                    try (OutputStream output = connection.getOutputStream()) {
                        output.write(body.getBytes(StandardCharsets.UTF_8));
                    }
                }
                int status = connection.getResponseCode();
                byte[] response = readAll(status >= 400 ? connection.getErrorStream() : connection.getInputStream());
                JSObject result = new JSObject();
                result.put("status", status);
                result.put("body", new String(response, StandardCharsets.UTF_8));
                result.put("contentType", connection.getContentType());
                call.resolve(result);
                connection.disconnect();
            } catch (Exception error) {
                call.reject(error.getMessage(), error);
            }
        }, "cvn-pinned-http").start());
    }

    @PluginMethod
    public void download(PluginCall call) {
        new Thread(() -> {
            try {
                String url = call.getString("url");
                String expectedHash = call.getString("sha256");
                if (url == null || expectedHash == null || !expectedHash.matches("[a-f0-9]{64}")) throw new IllegalArgumentException("url and sha256 are required");
                File directory = new File(getContext().getFilesDir(), "cvn-media");
                if (!directory.exists() && !directory.mkdirs()) throw new IllegalStateException("Unable to create media directory");
                String suffix = safeMediaSuffix(call.getString("fileName"));
                File completed = new File(directory, expectedHash + suffix);
                File partial = new File(directory, expectedHash + suffix + ".part");
                File legacy = new File(directory, expectedHash);
                if (!suffix.isEmpty() && legacy.exists() && !completed.exists() && expectedHash.equals(fileSha256(legacy))) {
                    if (!legacy.renameTo(completed)) throw new IllegalStateException("Unable to migrate cached media filename");
                }
                if (completed.exists() && expectedHash.equals(fileSha256(completed))) {
                    JSObject result = new JSObject();
                    result.put("path", completed.getAbsolutePath());
                    result.put("bytes", completed.length());
                    call.resolve(result);
                    return;
                }
                if (partial.exists() && expectedHash.equals(fileSha256(partial))) {
                    if (completed.exists()) completed.delete();
                    if (!partial.renameTo(completed)) throw new IllegalStateException("Unable to finalize completed partial media");
                    JSObject result = new JSObject();
                    result.put("path", completed.getAbsolutePath());
                    result.put("bytes", completed.length());
                    call.resolve(result);
                    return;
                }
                long offset = partial.exists() ? partial.length() : 0;
                HttpsURLConnection connection = openConnection(url, call.getString("spkiSha256"));
                applyHeaders(connection, call.getObject("headers", new JSObject()));
                if (offset > 0) connection.setRequestProperty("Range", "bytes=" + offset + "-");
                int status = connection.getResponseCode();
                if (status != 200 && status != 206) throw new IllegalStateException("Media download failed with HTTP " + status);
                boolean append = status == 206 && offset > 0;
                if (!append) offset = 0;
                try (InputStream input = new BufferedInputStream(connection.getInputStream()); OutputStream output = new BufferedOutputStream(new FileOutputStream(partial, append))) {
                    byte[] buffer = new byte[65536];
                    int count;
                    while ((count = input.read(buffer)) >= 0) output.write(buffer, 0, count);
                }
                connection.disconnect();
                if (!expectedHash.equals(fileSha256(partial))) {
                    partial.delete();
                    throw new SecurityException("Downloaded media hash does not match manifest");
                }
                if (completed.exists()) completed.delete();
                if (!partial.renameTo(completed)) throw new IllegalStateException("Unable to finalize media download");
                JSObject result = new JSObject();
                result.put("path", completed.getAbsolutePath());
                result.put("bytes", completed.length());
                call.resolve(result);
            } catch (Exception error) {
                call.reject(error.getMessage(), error);
            }
        }, "cvn-media-download").start();
    }

    @PluginMethod
    public void verifySignature(PluginCall call) {
        try {
            String data = call.getString("data");
            String encodedSignature = call.getString("signature");
            String encodedKey = call.getString("publicKeySpki");
            if (data == null || encodedSignature == null || encodedKey == null) throw new IllegalArgumentException("data, signature, and publicKeySpki are required");
            KeyFactory factory = KeyFactory.getInstance("EC");
            java.security.PublicKey key = factory.generatePublic(new X509EncodedKeySpec(Base64.decode(encodedKey, Base64.URL_SAFE | Base64.NO_WRAP)));
            Signature verifier = Signature.getInstance("SHA256withECDSA");
            verifier.initVerify(key);
            verifier.update(data.getBytes(StandardCharsets.UTF_8));
            JSObject result = new JSObject();
            result.put("valid", verifier.verify(Base64.decode(encodedSignature, Base64.URL_SAFE | Base64.NO_WRAP)));
            call.resolve(result);
        } catch (Exception error) {
            call.reject(error.getMessage(), error);
        }
    }

    @PluginMethod
    public void clearMedia(PluginCall call) {
        try {
            Set<String> keep = new HashSet<>();
            com.getcapacitor.JSArray requested = call.getArray("keepSha256");
            if (requested != null) {
                for (int index = 0; index < requested.length(); index++) keep.add(requested.getString(index));
            }
            File directory = new File(getContext().getFilesDir(), "cvn-media");
            int removed = 0;
            File[] files = directory.listFiles();
            if (files != null) {
                for (File file : files) {
                    String name = file.getName();
                    String hash = name.length() >= 64 ? name.substring(0, 64) : name;
                    if (!keep.contains(hash) && file.delete()) removed++;
                }
            }
            JSObject result = new JSObject();
            result.put("removed", removed);
            call.resolve(result);
        } catch (Exception error) {
            call.reject(error.getMessage(), error);
        }
    }

    private static String fileSha256(File file) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (InputStream input = new FileInputStream(file)) {
            byte[] buffer = new byte[65536];
            int count;
            while ((count = input.read(buffer)) >= 0) digest.update(buffer, 0, count);
        }
        StringBuilder value = new StringBuilder();
        for (byte item : digest.digest()) value.append(String.format("%02x", item));
        return value.toString();
    }
}
