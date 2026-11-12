package ir.azmayar.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.List;
import java.util.Locale;

/**
 * Home-screen Leitner widget: shows today's due card, lets the user flip
 * to the answer and rate the card (known / unknown) WITHOUT opening the app.
 * Progress is stored in SharedPreferences and synced with the app via
 * LeitnerBridgePlugin (last-write-wins per card, using updatedAt).
 */
public class LeitnerWidgetProvider extends AppWidgetProvider {

    public static final String PREFS = "azmayar_widget";
    public static final String KEY_STATE = "leitner_state";
    public static final String KEY_CURRENT = "current_id";
    public static final String KEY_FLIPPED = "flipped";

    public static final String ACTION_FLIP = "mojtaba.app.lab.WIDGET_FLIP";
    public static final String ACTION_GOOD = "mojtaba.app.lab.WIDGET_GOOD";
    public static final String ACTION_BAD = "mojtaba.app.lab.WIDGET_BAD";
    public static final String ACTION_REFRESH = "mojtaba.app.lab.WIDGET_REFRESH";

    // Leitner intervals in days for boxes 1..5 (must match the app: BOX_INTERVALS)
    private static final long[] INTERVALS_DAYS = {1, 3, 7, 14, 30};
    private static final long DAY_MS = 86400000L;
    private static final long RETRY_MS = 10 * 60 * 1000L; // unknown → re-ask in 10 minutes

    private static final String CARDS_ASSET = "public/data/cards.json";

    private static List<Card> sCards; // process-level cache

    private static class Card {
        String id;
        String front;
        String back;
        String cat;
    }

    // ---------------- lifecycle ----------------

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        SharedPreferences sp = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        sp.edit().putBoolean(KEY_FLIPPED, false).apply();
        render(context);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        SharedPreferences sp = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        if (ACTION_FLIP.equals(action)) {
            sp.edit().putBoolean(KEY_FLIPPED, true).apply();
        } else if (ACTION_GOOD.equals(action) || ACTION_BAD.equals(action)) {
            answer(context, ACTION_GOOD.equals(action));
            sp.edit().putBoolean(KEY_FLIPPED, false).apply();
        } else if (ACTION_REFRESH.equals(action)) {
            sp.edit().putBoolean(KEY_FLIPPED, false).apply();
        }
        super.onReceive(context, intent);
        render(context);
    }

    /** called by the Capacitor plugin whenever the app saves its progress */
    public static void refreshAll(Context context) {
        render(context);
    }

    // ---------------- core logic ----------------

    private static List<Card> loadCards(Context ctx) {
        if (sCards != null) return sCards;
        try {
            InputStream in = ctx.getAssets().open(CARDS_ASSET);
            ByteArrayOutputStream buf = new ByteArrayOutputStream();
            byte[] tmp = new byte[8192];
            int n;
            while ((n = in.read(tmp)) > 0) buf.write(tmp, 0, n);
            in.close();
            JSONArray arr = new JSONArray(new String(buf.toByteArray(), "UTF-8"));
            List<Card> cards = new ArrayList<>();
            for (int i = 0; i < arr.length(); i++) {
                JSONObject o = arr.getJSONObject(i);
                Card c = new Card();
                c.id = o.optString("id", "");
                c.front = o.optString("front", "").trim();
                c.back = o.optString("back", "").trim();
                c.cat = o.optString("cat", "");
                if (c.id.isEmpty() || c.front.isEmpty() || c.back.isEmpty()) continue;
                cards.add(c);
            }
            sCards = cards;
        } catch (Exception e) {
            sCards = new ArrayList<>();
        }
        return sCards;
    }

    private static JSONObject readState(SharedPreferences sp) {
        try {
            return new JSONObject(sp.getString(KEY_STATE, "{}"));
        } catch (Exception e) {
            return new JSONObject();
        }
    }

    private static class DueItem {
        Card card;
        int box; // 0 = new
        long due;
    }

    private static DueItem nextDue(Context ctx, JSONObject state, long now, int[] boxCounts) {
        List<Card> cards = loadCards(ctx);
        List<DueItem> due = new ArrayList<>();
        for (int i = 0; i < 6; i++) boxCounts[i] = 0;
        for (Card c : cards) {
            JSONObject st = state.optJSONObject(c.id);
            if (st == null) {
                boxCounts[0]++;
                DueItem d = new DueItem();
                d.card = c;
                d.box = 0;
                d.due = 0;
                due.add(d);
                continue;
            }
            int box = st.optInt("box", 1);
            if (box < 0 || box > 5) box = 1;
            boxCounts[box]++;
            long dueAt = st.optLong("due", 0);
            if (dueAt <= now) {
                DueItem d = new DueItem();
                d.card = c;
                d.box = box;
                d.due = dueAt;
                due.add(d);
            }
        }
        if (due.isEmpty()) return null;
        // same ordering as the app: lower box first, then oldest due
        Collections.sort(due, new Comparator<DueItem>() {
            @Override
            public int compare(DueItem a, DueItem b) {
                if (a.box != b.box) return a.box - b.box;
                return (a.due < b.due) ? -1 : ((a.due > b.due) ? 1 : 0);
            }
        });
        return due.get(0);
    }

    private static void answer(Context ctx, boolean good) {
        try {
            SharedPreferences sp = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            JSONObject state = readState(sp);
            String curId = sp.getString(KEY_CURRENT, "");
            if (curId.isEmpty()) return;
            long now = System.currentTimeMillis();
            JSONObject st = state.optJSONObject(curId);
            if (st == null) st = new JSONObject();
            int box = st.optInt("box", 0);
            long due;
            if (good) {
                box = Math.min(5, box + 1);
                int idx = Math.max(0, Math.min(4, box - 1));
                due = now + INTERVALS_DAYS[idx] * DAY_MS;
            } else {
                box = 1;
                due = now + RETRY_MS;
            }
            st.put("box", box);
            st.put("due", due);
            st.put("updatedAt", now);
            state.put(curId, st);
            sp.edit().putString(KEY_STATE, state.toString()).apply();
        } catch (Exception ignored) {
        }
    }

    // merge two state JSONs: newest updatedAt wins per card
    public static String mergeStates(String base, String incoming) {
        try {
            JSONObject a = new JSONObject(base == null ? "{}" : base);
            JSONObject b = new JSONObject(incoming == null ? "{}" : incoming);
            for (java.util.Iterator<String> it = b.keys(); it.hasNext(); ) {
                String id = it.next();
                JSONObject nb = b.optJSONObject(id);
                if (nb == null) continue;
                JSONObject oa = a.optJSONObject(id);
                long upd = nb.optLong("updatedAt", 0);
                if (oa == null) {
                    a.put(id, nb);
                } else {
                    long oldUpd = oa.optLong("updatedAt", 0);
                    if (upd >= oldUpd) a.put(id, nb);
                }
            }
            return a.toString();
        } catch (Exception e) {
            return base == null ? "{}" : base;
        }
    }

    // ---------------- rendering ----------------

    private static void render(Context ctx) {
        try {
            AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
            ComponentName comp = new ComponentName(ctx, LeitnerWidgetProvider.class);
            int[] ids = mgr.getAppWidgetIds(comp);
            if (ids == null || ids.length == 0) return;

            SharedPreferences sp = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            JSONObject state = readState(sp);
            long now = System.currentTimeMillis();
            int[] boxCounts = new int[6];
            DueItem item = nextDue(ctx, state, now, boxCounts);
            boolean flipped = sp.getBoolean(KEY_FLIPPED, false);

            RemoteViews rv = new RemoteViews(ctx.getPackageName(), R.layout.leitner_widget);
            rv.setOnClickPendingIntent(R.id.w_root, pi(ctx, ACTION_REFRESH, 4));

            int total = boxCounts[0] + boxCounts[1] + boxCounts[2] + boxCounts[3] + boxCounts[4] + boxCounts[5];

            if (item != null) {
                Card c = item.card;
                rv.setViewVisibility(R.id.w_done_row, View.GONE);
                rv.setViewVisibility(R.id.w_body, View.VISIBLE);
                rv.setViewVisibility(R.id.w_answer, View.GONE);
                rv.setViewVisibility(R.id.w_btn_flip, View.GONE);
                rv.setViewVisibility(R.id.w_btn_good, View.GONE);
                rv.setViewVisibility(R.id.w_btn_bad, View.GONE);

                if (flipped) {
                    rv.setTextViewText(R.id.w_body, c.front);
                    rv.setViewVisibility(R.id.w_answer, View.VISIBLE);
                    rv.setTextViewText(R.id.w_answer, c.back);
                    rv.setViewVisibility(R.id.w_btn_good, View.VISIBLE);
                    rv.setViewVisibility(R.id.w_btn_bad, View.VISIBLE);
                } else {
                    rv.setTextViewText(R.id.w_body, c.front);
                    rv.setViewVisibility(R.id.w_btn_flip, View.VISIBLE);
                }
                rv.setTextViewText(R.id.w_badge, faNum(dueCount(state, now)) + " کارت");
                rv.setOnClickPendingIntent(R.id.w_btn_flip, pi(ctx, ACTION_FLIP, 1));
                rv.setOnClickPendingIntent(R.id.w_btn_good, pi(ctx, ACTION_GOOD, 2));
                rv.setOnClickPendingIntent(R.id.w_btn_bad, pi(ctx, ACTION_BAD, 3));
                sp.edit().putString(KEY_CURRENT, c.id).apply();
            } else {
                rv.setViewVisibility(R.id.w_body, View.VISIBLE);
                rv.setViewVisibility(R.id.w_answer, View.GONE);
                rv.setViewVisibility(R.id.w_btn_flip, View.GONE);
                rv.setViewVisibility(R.id.w_btn_good, View.GONE);
                rv.setViewVisibility(R.id.w_btn_bad, View.GONE);
                rv.setViewVisibility(R.id.w_done_row, View.VISIBLE);
                rv.setTextViewText(R.id.w_body, "امروز همه کارت‌ها مرور شد. عالی بود!");
                rv.setTextViewText(R.id.w_badge, "تمام");
            }

            int learned = boxCounts[4] + boxCounts[5];
            rv.setTextViewText(R.id.w_footer, "مجموع: " + faNum(total) + " کارت • آموخته‌شده: " + faNum(learned));

            mgr.updateAppWidget(ids, rv);
        } catch (Exception ignored) {
        }
    }

    private static int dueCount(JSONObject state, long now) {
        // cheap re-count (state only, no asset parse) is not exact for "new" cards;
        // keep it simple: count states due now
        try {
            int n = 0;
            for (java.util.Iterator<String> it = state.keys(); it.hasNext(); ) {
                JSONObject st = state.optJSONObject(it.next());
                if (st != null && st.optLong("due", Long.MAX_VALUE) <= now) n++;
            }
            return n;
        } catch (Exception e) {
            return 0;
        }
    }

    private static PendingIntent pi(Context ctx, String action, int code) {
        Intent i = new Intent(ctx, LeitnerWidgetProvider.class);
        i.setAction(action);
        return PendingIntent.getBroadcast(ctx, code, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static String faNum(String s) {
        StringBuilder sb = new StringBuilder();
        for (char ch : s.toCharArray()) {
            if (ch >= '0' && ch <= '9') {
                sb.append((char) ('۰' + (ch - '0')));
            } else {
                sb.append(ch);
            }
        }
        return sb.toString();
    }

    private static String faNum(int n) {
        return faNum(String.valueOf(n));
    }
}
