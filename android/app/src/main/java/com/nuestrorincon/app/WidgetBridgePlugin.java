package com.nuestrorincon.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Base64;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;

/**
 * Puente entre la app web y los widgets de la pantalla de inicio.
 *
 * La web calcula los textos (días juntos, distancia, el recuerdo a
 * mostrar...) y llama a `WidgetBridge.update({...})`. Este plugin sólo
 * guarda esos valores en las SharedPreferences que leen los
 * AppWidgetProvider, y les pide que se repinten ya. Así toda la lógica de
 * fechas y frases vive en un único sitio (TypeScript), no duplicada aquí.
 */
@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {

    public static final String PREFS = "widget_data";
    static final String MEMORY_FILE = "widget_memory.jpg";

    @PluginMethod
    public void update(PluginCall call) {
        Context ctx = getContext();
        SharedPreferences prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();

        putIfPresent(call, editor, "daysNumber");
        putIfPresent(call, editor, "daysBreakdown");
        putIfPresent(call, editor, "milestoneText");
        putIfPresent(call, editor, "meName");
        putIfPresent(call, editor, "otherName");
        putIfPresent(call, editor, "meEmoji");
        putIfPresent(call, editor, "otherEmoji");
        putIfPresent(call, editor, "distanceText");
        putIfPresent(call, editor, "distanceUpdated");
        putIfPresent(call, editor, "memoryCaption");
        putIfPresent(call, editor, "memoryDate");

        String image = call.getString("memoryImage");
        if (image != null && !image.isEmpty()) {
            saveBitmap(image, new File(ctx.getFilesDir(), MEMORY_FILE));
            editor.putBoolean("hasMemoryImage", true);
        }

        JSArray carousel = call.getArray("carousel");
        if (carousel != null) {
            saveCarousel(ctx, editor, carousel);
        }

        editor.apply();

        DaysWidgetProvider.updateAll(ctx);
        DistanceWidgetProvider.updateAll(ctx);
        MemoryWidgetProvider.updateAll(ctx);
        MemoryCarouselWidgetProvider.refreshAll(ctx);

        call.resolve(new JSObject().put("ok", true));
    }

    /** Guarda hasta 10 fotos de "Recuerdos" para el widget carrusel, cada una
     * como un fichero numerado, más sus datos (frase y fecha) en JSON. */
    private void saveCarousel(Context ctx, SharedPreferences.Editor editor, JSArray carousel) {
        try {
            int count = Math.min(carousel.length(), 10);
            JSONObject meta = new JSONObject();
            for (int i = 0; i < count; i++) {
                JSONObject item = carousel.getJSONObject(i);
                String image = item.optString("image", "");
                if (image.isEmpty()) continue;
                saveBitmap(image, MemoryCarouselWidgetProvider.photoFile(ctx, i));
                JSONObject entry = new JSONObject();
                entry.put("caption", item.optString("caption", ""));
                entry.put("date", item.optString("date", ""));
                meta.put(String.valueOf(i), entry);
            }
            editor.putInt("carouselCount", count);
            editor.putString("carouselMeta", meta.toString());
        } catch (Exception e) {
            // Si algo falla, el carrusel se queda como estaba.
        }
    }

    private void putIfPresent(PluginCall call, SharedPreferences.Editor editor, String key) {
        String value = call.getString(key);
        if (value != null) editor.putString(key, value);
    }

    /** Decodifica una imagen en base64 (con o sin cabecera "data:...,") y la
     * guarda como JPEG en el fichero indicado. */
    private void saveBitmap(String dataUrl, File out) {
        try {
            String base64 = dataUrl;
            int comma = dataUrl.indexOf(',');
            if (dataUrl.startsWith("data:") && comma != -1) {
                base64 = dataUrl.substring(comma + 1);
            }
            byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
            Bitmap bmp = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
            if (bmp == null) return;
            try (FileOutputStream fos = new FileOutputStream(out)) {
                bmp.compress(Bitmap.CompressFormat.JPEG, 85, fos);
            }
        } catch (Exception e) {
            // Si la imagen no se puede guardar, el widget se queda con la anterior.
        }
    }
}
