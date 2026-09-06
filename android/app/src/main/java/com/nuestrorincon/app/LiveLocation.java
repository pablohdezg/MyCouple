package com.nuestrorincon.app;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

/**
 * Todo lo que necesita el servicio de ubicación para hablar con Supabase él
 * solo, sin la app abierta.
 *
 * Antes la posición se le pasaba a la parte web para que la subiera. Eso
 * funcionaba con la app abierta o en segundo plano reciente, pero en cuanto
 * el sistema se llevaba por delante la ventana (o la cerrabas del todo), el
 * servicio seguía tomando posiciones que ya no llegaban a ninguna parte.
 *
 * Ahora la configuración vive aquí, en las SharedPreferences, y el servicio
 * sube la posición por su cuenta a una tabla propia y diminuta
 * ("ubicaciones"): cuatro números por aviso, en vez del estado entero de la
 * app.
 */
final class LiveLocation {

    static final String PREFS = "live_location";

    private static final String K_URL = "url";
    private static final String K_KEY = "key";
    private static final String K_CODE = "code";
    private static final String K_ME = "me";
    private static final String K_OTHER_NAME = "otherName";
    private static final String K_PLACES = "places";
    private static final String K_ENABLED = "enabled";
    private static final String K_INTERVAL = "intervalMs";
    private static final String K_DISTANCE = "distanceM";

    private LiveLocation() {}

    static SharedPreferences prefs(Context ctx) {
        return ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    /** Guarda lo que el servicio necesita saber para funcionar solo. */
    static void saveConfig(
            Context ctx,
            String url,
            String key,
            String code,
            String me,
            String otherName,
            String placesJson) {
        SharedPreferences.Editor e = prefs(ctx).edit();
        if (url != null) e.putString(K_URL, url);
        if (key != null) e.putString(K_KEY, key);
        if (code != null) e.putString(K_CODE, code);
        if (me != null) e.putString(K_ME, me);
        if (otherName != null) e.putString(K_OTHER_NAME, otherName);
        if (placesJson != null) e.putString(K_PLACES, placesJson);
        e.apply();
    }

    /** Marca si el reparto está activo, para saber si hay que revivirlo al
     * encender el móvil. */
    static void setEnabled(Context ctx, boolean enabled, long intervalMs, float distanceM) {
        prefs(ctx).edit()
                .putBoolean(K_ENABLED, enabled)
                .putLong(K_INTERVAL, intervalMs)
                .putFloat(K_DISTANCE, distanceM)
                .apply();
    }

    static boolean isEnabled(Context ctx) {
        return prefs(ctx).getBoolean(K_ENABLED, false);
    }

    static long interval(Context ctx) {
        return prefs(ctx).getLong(K_INTERVAL, 3 * 60 * 1000L);
    }

    static float distance(Context ctx) {
        return prefs(ctx).getFloat(K_DISTANCE, 50f);
    }

    static String me(Context ctx) {
        return prefs(ctx).getString(K_ME, "a");
    }

    static String other(Context ctx) {
        return "a".equals(me(ctx)) ? "b" : "a";
    }

    static String otherName(Context ctx) {
        return prefs(ctx).getString(K_OTHER_NAME, "Tu pareja");
    }

    static boolean configured(Context ctx) {
        SharedPreferences p = prefs(ctx);
        String url = p.getString(K_URL, "");
        String key = p.getString(K_KEY, "");
        String code = p.getString(K_CODE, "");
        return !url.isEmpty() && !key.isEmpty() && !code.isEmpty() && url.startsWith("http");
    }

    private static String endpoint(Context ctx, String query) {
        String url = prefs(ctx).getString(K_URL, "");
        while (url.endsWith("/")) url = url.substring(0, url.length() - 1);
        return url + "/rest/v1/ubicaciones" + query;
    }

    private static void auth(Context ctx, HttpURLConnection conn) {
        String key = prefs(ctx).getString(K_KEY, "");
        conn.setRequestProperty("apikey", key);
        conn.setRequestProperty("Authorization", "Bearer " + key);
        conn.setConnectTimeout(15000);
        conn.setReadTimeout(15000);
    }

    /** Sube nuestra posición. Devuelve true si Supabase la aceptó. */
    static boolean upload(Context ctx, double lat, double lon, float accuracy, int battery) {
        if (!configured(ctx)) return false;
        HttpURLConnection conn = null;
        try {
            JSONObject row = new JSONObject();
            row.put("code", prefs(ctx).getString(K_CODE, ""));
            row.put("who", me(ctx));
            row.put("lat", lat);
            row.put("lon", lon);
            row.put("accuracy", accuracy);
            row.put("battery", battery >= 0 ? (Object) battery : JSONObject.NULL);
            // La hora hay que mandarla siempre y a mano: en un upsert sólo se
            // actualizan las columnas que van en el envío, así que si no la
            // mandamos, "at" se queda con la de la primerísima vez y la app
            // descarta la posición nueva por parecer más vieja que la guardada.
            row.put("at", nowIso());
            JSONArray body = new JSONArray().put(row);

            conn = (HttpURLConnection) new URL(endpoint(ctx, "")).openConnection();
            conn.setRequestMethod("POST");
            auth(ctx, conn);
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("Prefer", "resolution=merge-duplicates,return=minimal");
            conn.setDoOutput(true);
            try (OutputStream out = conn.getOutputStream()) {
                out.write(body.toString().getBytes(StandardCharsets.UTF_8));
            }
            int status = conn.getResponseCode();
            return status >= 200 && status < 300;
        } catch (Exception e) {
            return false;
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    /** La última posición conocida de la otra persona, o null. */
    static JSONObject fetchOther(Context ctx) {
        if (!configured(ctx)) return null;
        HttpURLConnection conn = null;
        try {
            String code = URLEncoder.encode(prefs(ctx).getString(K_CODE, ""), "UTF-8");
            String query = "?code=eq." + code + "&who=eq." + other(ctx) + "&select=*&limit=1";
            conn = (HttpURLConnection) new URL(endpoint(ctx, query)).openConnection();
            conn.setRequestMethod("GET");
            auth(ctx, conn);
            if (conn.getResponseCode() != 200) return null;
            StringBuilder sb = new StringBuilder();
            try (BufferedReader r = new BufferedReader(
                    new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = r.readLine()) != null) sb.append(line);
            }
            JSONArray rows = new JSONArray(sb.toString());
            return rows.length() > 0 ? rows.getJSONObject(0) : null;
        } catch (Exception e) {
            return null;
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    /** Nombre del lugar guardado en el que cae esa posición, o null si
     * no está en ninguno. */
    static String placeAt(Context ctx, double lat, double lon) {
        try {
            JSONArray places = new JSONArray(prefs(ctx).getString(K_PLACES, "[]"));
            for (int i = 0; i < places.length(); i++) {
                JSONObject p = places.getJSONObject(i);
                double d = metersBetween(lat, lon, p.getDouble("lat"), p.getDouble("lon"));
                if (d <= p.optDouble("radius", 120)) {
                    String emoji = p.optString("emoji", "");
                    String name = p.optString("name", "");
                    return emoji.isEmpty() ? name : emoji + " " + name;
                }
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    /** Hora actual en UTC con el formato que espera Postgres. */
    static String nowIso() {
        SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US);
        f.setTimeZone(TimeZone.getTimeZone("UTC"));
        return f.format(new Date());
    }

    /** Distancia en metros entre dos coordenadas (fórmula del semiverseno). */
    static double metersBetween(double lat1, double lon1, double lat2, double lon2) {
        double r = 6371000;
        double p1 = Math.toRadians(lat1);
        double p2 = Math.toRadians(lat2);
        double dp = Math.toRadians(lat2 - lat1);
        double dl = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dp / 2) * Math.sin(dp / 2)
                + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
        return 2 * r * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}
