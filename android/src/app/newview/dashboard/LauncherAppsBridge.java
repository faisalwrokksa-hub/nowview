package app.newview.dashboard;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.webkit.JavascriptInterface;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/** Optional, read-only app discovery for a user-selected Android TV launcher.
 * Must be explicitly registered by MainActivity using addJavascriptInterface.
 * Never use QUERY_ALL_PACKAGES or expose arbitrary intent launching.
 */
public final class LauncherAppsBridge {
    private final Context context;
    public LauncherAppsBridge(Context context) { this.context = context.getApplicationContext(); }

    @JavascriptInterface
    public String listLaunchableApps() {
        PackageManager pm = context.getPackageManager();
        List<ResolveInfo> results = new ArrayList<>();
        Intent tv = new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LEANBACK_LAUNCHER);
        Intent regular = new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER);
        results.addAll(pm.queryIntentActivities(tv, 0));
        results.addAll(pm.queryIntentActivities(regular, 0));
        Collections.sort(results, new Comparator<ResolveInfo>() {
            @Override public int compare(ResolveInfo a, ResolveInfo b) {
                return String.valueOf(a.loadLabel(pm)).compareToIgnoreCase(String.valueOf(b.loadLabel(pm)));
            }
        });
        JSONArray array = new JSONArray();
        Set<String> seen = new HashSet<>();
        for (ResolveInfo info : results) {
            if (info.activityInfo == null) continue;
            String pkg = info.activityInfo.packageName;
            if (pkg == null || pkg.equals(context.getPackageName()) || !seen.add(pkg)) continue;
            if (pm.getLeanbackLaunchIntentForPackage(pkg) == null && pm.getLaunchIntentForPackage(pkg) == null) continue;
            JSONObject item = new JSONObject();
            try { item.put("packageName", pkg); item.put("label", String.valueOf(info.loadLabel(pm))); array.put(item); }
            catch (org.json.JSONException ignored) { }
            if (array.length() >= 100) break;
        }
        return array.toString();
    }

    @JavascriptInterface
    public boolean launchApp(String packageName) {
        if (packageName == null || !packageName.matches("([A-Za-z][A-Za-z0-9_]*\\.)+[A-Za-z][A-Za-z0-9_]*")) return false;
        PackageManager pm = context.getPackageManager();
        Intent intent = pm.getLeanbackLaunchIntentForPackage(packageName);
        if (intent == null) intent = pm.getLaunchIntentForPackage(packageName);
        if (intent == null) return false;
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try { context.startActivity(intent); return true; }
        catch (RuntimeException ex) { return false; }
    }
}
