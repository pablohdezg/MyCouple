package com.nuestrorincon.app;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.location.Location;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.PermissionState;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * Puente entre la app web y el servicio de ubicación en segundo plano.
 *
 * Desde JavaScript:
 *   LocationSharing.start({ title, text, intervalMs, distanceM })
 *   LocationSharing.stop()
 *   LocationSharing.isRunning()
 *   LocationSharing.addListener('location', fn)
 */
@CapacitorPlugin(
        name = "LocationSharing",
        permissions = {
                @Permission(
                        alias = "location",
                        strings = {
                                Manifest.permission.ACCESS_FINE_LOCATION,
                                Manifest.permission.ACCESS_COARSE_LOCATION
                        }
                ),
                @Permission(
                        alias = "notifications",
                        strings = {"android.permission.POST_NOTIFICATIONS"}
                )
        }
)
public class LocationSharingPlugin extends Plugin {

    @Override
    public void load() {
        LocationSharingService.setSink(location -> {
            JSObject data = toJs(location);
            notifyListeners("location", data);
        });
    }

    private JSObject toJs(Location l) {
        JSObject o = new JSObject();
        o.put("lat", l.getLatitude());
        o.put("lon", l.getLongitude());
        o.put("accuracy", l.getAccuracy());
        o.put("at", l.getTime() > 0 ? l.getTime() : System.currentTimeMillis());
        return o;
    }

    @PluginMethod
    public void isRunning(PluginCall call) {
        JSObject res = new JSObject();
        res.put("running", LocationSharingService.isRunning());
        call.resolve(res);
    }

    /**
     * Le pasa al servicio lo que necesita para trabajar solo: credenciales de
     * sincronización, quién es quién y vuestros lugares guardados. Sin esto,
     * el servicio no sabría dónde subir la posición con la app cerrada.
     */
    @PluginMethod
    public void configure(PluginCall call) {
        LiveLocation.saveConfig(
                getContext(),
                call.getString("url"),
                call.getString("key"),
                call.getString("code"),
                call.getString("me"),
                call.getString("otherName"),
                call.getString("places"));
        call.resolve(new JSObject().put("ok", true));
    }

    /** ¿Está la app exenta de la optimización de batería? Sin eso, muchos
     * móviles matan el servicio a las pocas horas. */
    @PluginMethod
    public void batteryStatus(PluginCall call) {
        JSObject res = new JSObject();
        res.put("exempt", isExempt());
        res.put("needed", Build.VERSION.SDK_INT >= Build.VERSION_CODES.M);
        call.resolve(res);
    }

    private boolean isExempt() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return true;
        PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
        return pm != null && pm.isIgnoringBatteryOptimizations(getContext().getPackageName());
    }

    /** Abre el diálogo del sistema para quitar la optimización de batería. */
    @PluginMethod
    public void requestBatteryExemption(PluginCall call) {
        if (isExempt()) {
            call.resolve(new JSObject().put("exempt", true));
            return;
        }
        try {
            Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve(new JSObject().put("exempt", false));
        } catch (Exception e) {
            // Si el fabricante no expone ese diálogo, al menos abrimos los
            // ajustes de la app para que se pueda hacer a mano.
            try {
                Intent settings = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                settings.setData(Uri.parse("package:" + getContext().getPackageName()));
                settings.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(settings);
            } catch (Exception ignored) {
            }
            call.resolve(new JSObject().put("exempt", false));
        }
    }

    @PluginMethod
    public void getLast(PluginCall call) {
        Location l = LocationSharingService.getLast();
        if (l == null) {
            call.resolve(new JSObject().put("available", false));
            return;
        }
        JSObject res = toJs(l);
        res.put("available", true);
        call.resolve(res);
    }

    @PluginMethod
    public void start(PluginCall call) {
        if (getPermissionState("location") != PermissionState.GRANTED) {
            requestPermissionForAlias("location", call, "afterLocation");
            return;
        }
        launch(call);
    }

    @PermissionCallback
    private void afterLocation(PluginCall call) {
        if (getPermissionState("location") != PermissionState.GRANTED) {
            call.reject("Sin permiso de ubicación", "NO_LOCATION_PERMISSION");
            return;
        }
        // A partir de Android 13 hace falta permiso para mostrar la
        // notificación del servicio; sin ella no se puede arrancar.
        if (Build.VERSION.SDK_INT >= 33
                && getPermissionState("notifications") != PermissionState.GRANTED) {
            requestPermissionForAlias("notifications", call, "afterNotifications");
            return;
        }
        launch(call);
    }

    @PermissionCallback
    private void afterNotifications(PluginCall call) {
        launch(call);
    }

    private void launch(PluginCall call) {
        try {
            Intent intent = new Intent(getContext(), LocationSharingService.class);
            intent.putExtra(LocationSharingService.EXTRA_TITLE,
                    call.getString("title", "Compartiendo tu ubicación"));
            intent.putExtra(LocationSharingService.EXTRA_TEXT,
                    call.getString("text", "Tu pareja puede ver dónde estás"));
            intent.putExtra(LocationSharingService.EXTRA_INTERVAL,
                    call.getLong("intervalMs", 3 * 60 * 1000L));
            intent.putExtra(LocationSharingService.EXTRA_DISTANCE,
                    call.getFloat("distanceM", 50f));

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                getContext().startForegroundService(intent);
            } else {
                getContext().startService(intent);
            }
            call.resolve(new JSObject().put("started", true));
        } catch (Exception e) {
            call.reject("No se pudo arrancar el servicio: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        // Primero apagamos la bandera: si no, el propio servicio se
        // reprogramaría al morir y volvería solo.
        LiveLocation.setEnabled(getContext(), false,
                LiveLocation.interval(getContext()), LiveLocation.distance(getContext()));
        getContext().stopService(new Intent(getContext(), LocationSharingService.class));
        call.resolve(new JSObject().put("started", false));
    }

    @Override
    protected void handleOnDestroy() {
        // No quitamos el sink: el servicio debe seguir vivo aunque se cierre
        // la ventana, que es justo el objetivo.
        super.handleOnDestroy();
    }
}
