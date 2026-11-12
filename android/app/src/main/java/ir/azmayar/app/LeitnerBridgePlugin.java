package ir.azmayar.app;

import android.content.Context;
import android.content.SharedPreferences;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;

/**
 * Capacitor bridge that syncs Leitner progress between the WebView app
 * and the native home-screen widget. Both sides merge per-card with
 * "newest updatedAt wins" so edits made in the widget (without opening
 * the app) are never lost.
 */
@CapacitorPlugin(name = "LeitnerBridge")
public class LeitnerBridgePlugin extends Plugin {

    @PluginMethod
    public void saveState(PluginCall call) {
        try {
            String value = call.getString("value");
            if (value == null) value = "{}";
            Context ctx = getContext();
            SharedPreferences sp = ctx.getSharedPreferences(LeitnerWidgetProvider.PREFS, Context.MODE_PRIVATE);
            String merged = LeitnerWidgetProvider.mergeStates(sp.getString(LeitnerWidgetProvider.KEY_STATE, "{}"), value);
            sp.edit().putString(LeitnerWidgetProvider.KEY_STATE, merged).apply();
            LeitnerWidgetProvider.refreshAll(ctx);
            JSObject ret = new JSObject();
            ret.put("ok", true);
            ret.put("value", merged);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("saveState failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void loadState(PluginCall call) {
        try {
            Context ctx = getContext();
            SharedPreferences sp = ctx.getSharedPreferences(LeitnerWidgetProvider.PREFS, Context.MODE_PRIVATE);
            JSObject ret = new JSObject();
            ret.put("value", sp.getString(LeitnerWidgetProvider.KEY_STATE, "{}"));
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("loadState failed: " + e.getMessage());
        }
    }
}
