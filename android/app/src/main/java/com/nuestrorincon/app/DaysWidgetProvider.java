package com.nuestrorincon.app;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

/** Widget: contador de días juntos y próximo mesaniversario. */
public class DaysWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        for (int id : appWidgetIds) {
            manager.updateAppWidget(id, build(context));
        }
    }

    static void updateAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName cn = new ComponentName(context, DaysWidgetProvider.class);
        int[] ids = manager.getAppWidgetIds(cn);
        for (int id : ids) {
            manager.updateAppWidget(id, build(context));
        }
    }

    private static RemoteViews build(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(WidgetBridgePlugin.PREFS, Context.MODE_PRIVATE);
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_days);

        views.setTextViewText(R.id.widget_days_number, prefs.getString("daysNumber", "0"));
        views.setTextViewText(R.id.widget_days_sub, prefs.getString("daysBreakdown", ""));
        views.setTextViewText(R.id.widget_days_milestone, prefs.getString("milestoneText", ""));
        views.setOnClickPendingIntent(R.id.widget_root, WidgetUtil.openApp(context));
        return views;
    }
}
