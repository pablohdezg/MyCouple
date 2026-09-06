package com.nuestrorincon.app;

import android.Manifest;
import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.BatteryManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;

import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Servicio en primer plano que sigue enviando la posición aunque la app
 * esté cerrada.
 *
 * Usa el LocationManager del sistema (no hacen falta los servicios de Google
 * Play), así que no añade ninguna dependencia al proyecto.
 *
 * Android obliga a mostrar una notificación permanente mientras esto está
 * activo: es el precio de que el sistema no mate el proceso.
 */
public class LocationSharingService extends Service implements LocationListener {

    public static final String CHANNEL_ID = "ubicacion_compartida";
    public static final int NOTIFICATION_ID = 4021;

    public static final String EXTRA_TITLE = "titulo";
    public static final String EXTRA_TEXT = "texto";
    public static final String EXTRA_INTERVAL = "intervalo";
    public static final String EXTRA_DISTANCE = "distancia";

    /** El plugin se suscribe aquí para recibir las posiciones. */
    public interface Sink {
        void onLocation(Location location);
    }

    private static Sink sink;
    private static Location last;
    private static boolean running = false;

    public static void setSink(Sink s) {
        sink = s;
    }

    public static Location getLast() {
        return last;
    }

    public static boolean isRunning() {
        return running;
    }

    private LocationManager manager;

    /** La red no se puede tocar desde el hilo principal. */
    private final ExecutorService net = Executors.newSingleThreadExecutor();
    private final Handler handler = new Handler(Looper.getMainLooper());

    /** Cuándo subimos la última posición y desde dónde, para no gastar datos
     * repitiendo lo mismo cada pocos segundos. */
    private long lastUploadAt = 0;
    private double lastUploadLat = 0;
    private double lastUploadLon = 0;

    /** Cada cuánto miramos dónde está la otra persona. */
    private static final long WATCH_INTERVAL = 5 * 60 * 1000L;
    private static final long UPLOAD_MIN_GAP = 60 * 1000L;
    private static final double UPLOAD_MIN_METERS = 75;

    private final Runnable watchOther = new Runnable() {
        @Override
        public void run() {
            offMainThread(() -> PartnerWatch.check(LocationSharingService.this,
                    LiveLocation.fetchOther(LocationSharingService.this)));
            handler.postDelayed(this, WATCH_INTERVAL);
        }
    };

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String title = "Compartiendo tu ubicación";
        String text = "Tu pareja puede ver dónde estás";
        long interval = 3 * 60 * 1000L;
        float distance = 50f;

        if (intent != null) {
            if (intent.getStringExtra(EXTRA_TITLE) != null) title = intent.getStringExtra(EXTRA_TITLE);
            if (intent.getStringExtra(EXTRA_TEXT) != null) text = intent.getStringExtra(EXTRA_TEXT);
            interval = intent.getLongExtra(EXTRA_INTERVAL, interval);
            distance = intent.getFloatExtra(EXTRA_DISTANCE, distance);
        }

        // Hay que llamar a startForeground en los primeros segundos o el
        // sistema mata el servicio.
        startForeground(NOTIFICATION_ID, buildNotification(title, text));
        running = true;

        // Dejamos constancia de que esto debe estar vivo, para poder
        // revivirlo al encender el móvil o si el sistema nos mata.
        LiveLocation.setEnabled(this, true, interval, distance);

        if (manager == null) manager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
        requestUpdates(interval, distance);

        // Y de paso, vigilamos a la otra persona: llegadas, salidas y batería.
        handler.removeCallbacks(watchOther);
        handler.postDelayed(watchOther, 20_000);

        // START_STICKY: si el sistema nos mata por memoria, que nos reinicie.
        return START_STICKY;
    }

    /**
     * Al cerrar la app desde recientes, algunos fabricantes se llevan el
     * servicio por delante aunque el manifiesto diga que no. Programamos un
     * despertador a los pocos segundos para volver a levantarlo.
     */
    @Override
    public void onTaskRemoved(Intent rootIntent) {
        if (LiveLocation.isEnabled(this)) scheduleRestart(this, 3000);
        super.onTaskRemoved(rootIntent);
    }

    /** Programa un intento de arranque del servicio dentro de un rato. */
    static void scheduleRestart(Context ctx, long delayMs) {
        try {
            AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
            if (am == null) return;
            Intent intent = new Intent(ctx, RestartReceiver.class);
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
            PendingIntent pending = PendingIntent.getBroadcast(ctx, 7021, intent, flags);
            am.set(AlarmManager.RTC_WAKEUP, System.currentTimeMillis() + delayMs, pending);
        } catch (Exception e) {
            Log.w("LocationSharing", "No se pudo programar el reinicio", e);
        }
    }

    /** Arranca el servicio con lo último que se configuró. */
    static void start(Context ctx) {
        try {
            Intent intent = new Intent(ctx, LocationSharingService.class);
            intent.putExtra(EXTRA_INTERVAL, LiveLocation.interval(ctx));
            intent.putExtra(EXTRA_DISTANCE, LiveLocation.distance(ctx));
            intent.putExtra(EXTRA_TEXT, LiveLocation.otherName(ctx) + " puede ver dónde estás");
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ctx.startForegroundService(intent);
            } else {
                ctx.startService(intent);
            }
        } catch (Exception e) {
            // En Android 12+ el sistema puede rechazar arrancarlo desde el
            // fondo si la app no está exenta de la optimización de batería.
            Log.w("LocationSharing", "No se pudo arrancar en segundo plano", e);
        }
    }

    /** Nivel de batería en porcentaje, o -1 si no se puede leer. */
    private int batteryLevel() {
        try {
            BatteryManager bm = (BatteryManager) getSystemService(Context.BATTERY_SERVICE);
            if (bm == null) return -1;
            int pct = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY);
            return (pct >= 0 && pct <= 100) ? pct : -1;
        } catch (Exception e) {
            return -1;
        }
    }

    /** El ejecutor rechaza tareas una vez apagado (al morir el servicio). */
    private void offMainThread(Runnable task) {
        try {
            net.execute(task);
        } catch (Exception ignored) {
        }
    }

    private void requestUpdates(long interval, float distance) {
        if (manager == null) return;
        boolean fine = ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
                == PackageManager.PERMISSION_GRANTED;
        boolean coarse = ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION)
                == PackageManager.PERMISSION_GRANTED;
        if (!fine && !coarse) {
            stopSelf();
            return;
        }
        try {
            // Pedimos a los dos proveedores: el GPS es preciso pero tarda y
            // no funciona bajo techo; la red es rápida y suficiente para
            // "está en casa".
            if (fine && manager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                manager.requestLocationUpdates(
                        LocationManager.GPS_PROVIDER, interval, distance, this, Looper.getMainLooper());
            }
            if (manager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                manager.requestLocationUpdates(
                        LocationManager.NETWORK_PROVIDER, interval, distance, this, Looper.getMainLooper());
            }
            // Una primera posición inmediata, si el sistema tiene alguna guardada.
            Location cached = null;
            if (fine) cached = manager.getLastKnownLocation(LocationManager.GPS_PROVIDER);
            if (cached == null) cached = manager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER);
            if (cached != null) onLocationChanged(cached);
        } catch (SecurityException | IllegalArgumentException e) {
            Log.w("LocationSharing", "No se pudieron pedir actualizaciones", e);
        }
    }

    private Notification buildNotification(String title, String text) {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && nm != null) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID, "Ubicación compartida", NotificationManager.IMPORTANCE_LOW);
            channel.setDescription("Aparece mientras compartes tu ubicación con tu pareja");
            channel.setShowBadge(false);
            nm.createNotificationChannel(channel);
        }

        Intent open = new Intent(this, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        PendingIntent pending = PendingIntent.getActivity(this, 0, open, flags);

        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(title)
                .setContentText(text)
                .setSmallIcon(R.drawable.ic_stat_icon)
                .setContentIntent(pending)
                .setOngoing(true)
                .setSilent(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setCategory(NotificationCompat.CATEGORY_SERVICE)
                .build();
    }

    @Override
    public void onLocationChanged(Location location) {
        if (location == null) return;
        // Nos quedamos con la mejor de las dos fuentes: si la nueva es mucho
        // menos precisa y muy reciente respecto a la anterior, la ignoramos.
        if (last != null
                && location.getTime() - last.getTime() < 30_000
                && location.getAccuracy() > last.getAccuracy() * 2) {
            return;
        }
        last = location;

        // Si la app está abierta, que se entere al momento.
        Sink s = sink;
        if (s != null) s.onLocation(location);

        // Y, esté abierta o no, la subimos nosotros mismos. Esto es lo que
        // hace que siga funcionando con la app cerrada del todo: antes se la
        // pasábamos a la parte web y, sin ventana viva, no la subía nadie.
        upload(location);
    }

    private void upload(Location location) {
        long now = System.currentTimeMillis();
        double moved = lastUploadAt == 0
                ? Double.MAX_VALUE
                : LiveLocation.metersBetween(
                        lastUploadLat, lastUploadLon, location.getLatitude(), location.getLongitude());
        // Ni spamear la red estando quieto, ni callarnos si nos hemos movido.
        if (now - lastUploadAt < UPLOAD_MIN_GAP && moved < UPLOAD_MIN_METERS) return;

        lastUploadAt = now;
        lastUploadLat = location.getLatitude();
        lastUploadLon = location.getLongitude();

        final double lat = location.getLatitude();
        final double lon = location.getLongitude();
        final float accuracy = location.getAccuracy();
        final int battery = batteryLevel();
        offMainThread(() -> LiveLocation.upload(this, lat, lon, accuracy, battery));
    }

    // Firmas antiguas que algunos fabricantes siguen exigiendo.
    @Override
    public void onStatusChanged(String provider, int status, Bundle extras) {}

    @Override
    public void onProviderEnabled(String provider) {}

    @Override
    public void onProviderDisabled(String provider) {}

    @Override
    public void onDestroy() {
        running = false;
        handler.removeCallbacks(watchOther);
        if (manager != null) {
            try {
                manager.removeUpdates(this);
            } catch (SecurityException ignored) {
            }
        }
        // Si nos han matado sin que nadie apagara el reparto, volvemos.
        if (LiveLocation.isEnabled(this)) scheduleRestart(this, 5000);
        net.shutdown();
        super.onDestroy();
    }
}
