package io.github.yaqxuan.contextvocabularynotebook;

import android.Manifest;
import android.content.Context;
import android.net.nsd.NsdManager;
import android.net.nsd.NsdServiceInfo;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.PermissionState;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;

@CapacitorPlugin(
    name = "LanDiscovery",
    permissions = { @Permission(strings = { Manifest.permission.NEARBY_WIFI_DEVICES }, alias = "nearby") }
)
public class LanDiscoveryPlugin extends Plugin {
    @PluginMethod
    public void discover(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && getPermissionState("nearby") != PermissionState.GRANTED) {
            requestPermissionForAlias("nearby", call, "nearbyPermissionCallback");
            return;
        }
        beginDiscovery(call);
    }

    @PermissionCallback
    private void nearbyPermissionCallback(PluginCall call) {
        if (getPermissionState("nearby") != PermissionState.GRANTED) {
            call.reject("Nearby devices permission is required for LAN discovery");
            return;
        }
        beginDiscovery(call);
    }

    private void beginDiscovery(PluginCall call) {
        NsdManager manager = (NsdManager) getContext().getSystemService(Context.NSD_SERVICE);
        WifiManager wifi = (WifiManager) getContext().getApplicationContext().getSystemService(Context.WIFI_SERVICE);
        WifiManager.MulticastLock multicastLock = wifi.createMulticastLock("cvn-mdns-discovery");
        multicastLock.setReferenceCounted(false);
        multicastLock.acquire();
        JSArray services = new JSArray();
        AtomicBoolean finished = new AtomicBoolean(false);
        Handler handler = new Handler(Looper.getMainLooper());
        NsdManager.DiscoveryListener listener = new NsdManager.DiscoveryListener() {
            @Override public void onDiscoveryStarted(String serviceType) {}
            @Override public void onStartDiscoveryFailed(String serviceType, int errorCode) { finish(); }
            @Override public void onStopDiscoveryFailed(String serviceType, int errorCode) { finish(); }
            @Override public void onDiscoveryStopped(String serviceType) {}
            @Override public void onServiceLost(NsdServiceInfo serviceInfo) {}
            @Override public void onServiceFound(NsdServiceInfo serviceInfo) {
                manager.resolveService(serviceInfo, new NsdManager.ResolveListener() {
                    @Override public void onResolveFailed(NsdServiceInfo info, int errorCode) {}
                    @Override public void onServiceResolved(NsdServiceInfo info) {
                        JSObject item = new JSObject();
                        item.put("name", info.getServiceName());
                        item.put("host", info.getHost() == null ? "" : info.getHost().getHostAddress());
                        item.put("port", info.getPort());
                        JSObject attributes = new JSObject();
                        for (Map.Entry<String, byte[]> entry : info.getAttributes().entrySet()) {
                            attributes.put(entry.getKey(), new String(entry.getValue(), StandardCharsets.UTF_8));
                        }
                        item.put("attributes", attributes);
                        services.put(item);
                    }
                });
            }
            private void finish() {
                if (finished.compareAndSet(false, true)) {
                    if (multicastLock.isHeld()) multicastLock.release();
                    JSObject result = new JSObject();
                    result.put("services", services);
                    call.resolve(result);
                }
            }
        };
        manager.discoverServices("_cvn-sync._tcp.", NsdManager.PROTOCOL_DNS_SD, listener);
        handler.postDelayed(() -> {
            try { manager.stopServiceDiscovery(listener); } catch (Exception ignored) {}
            if (finished.compareAndSet(false, true)) {
                if (multicastLock.isHeld()) multicastLock.release();
                JSObject result = new JSObject();
                result.put("services", services);
                call.resolve(result);
            }
        }, 2500);
    }
}
