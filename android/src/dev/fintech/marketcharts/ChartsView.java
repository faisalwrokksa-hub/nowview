package app.nowview.markets;
import android.content.Context;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.util.Arrays;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONObject;

public final class ChartsView extends WebView {
    private final ExecutorService worker=Executors.newSingleThreadExecutor();
    private volatile boolean closed=false;
    public ChartsView(Context context,boolean compact){
        super(context);WebSettings s=getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setAllowFileAccess(false);s.setAllowContentAccess(false);s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        setBackgroundColor(0xff080c13);
        setWebViewClient(new WebViewClient(){
            @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){return !r.getUrl().toString().startsWith("file:///android_asset/index.html");}
            @Override public boolean shouldOverrideUrlLoading(WebView v,String u){return !u.startsWith("file:///android_asset/index.html");}
        });
        addJavascriptInterface(new Bridge(),"Fintech");loadUrl("file:///android_asset/index.html"+(compact?"?home=1":""));
    }
    public final class Bridge {
        @JavascriptInterface public boolean getPanelReady(){String enabled=android.provider.Settings.Secure.getString(getContext().getContentResolver(),android.provider.Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES);return android.provider.Settings.canDrawOverlays(getContext())&&enabled!=null&&(enabled.contains("app.nowview.markets/.HomePanelService")||enabled.contains("app.nowview.markets/app.nowview.markets.HomePanelService"));}
        @JavascriptInterface public boolean getPanelEnabled(){return getContext().getSharedPreferences("charts",0).getBoolean("homePanel",true);}
        @JavascriptInterface public void setPanelEnabled(boolean enabled){getContext().getSharedPreferences("charts",0).edit().putBoolean("homePanel",enabled).apply();if(!enabled)post(HomePanelService::hidePanel);}
        @JavascriptInterface public void requestChart(final String symbol,final String period,final int id){
            if(!Arrays.asList(MarketData.SYMBOLS).contains(symbol)||!Arrays.asList(MarketData.RANGES).contains(period)){deliver(id,error("Unsupported token or range"));return;}
            if(closed)return;
            worker.execute(()->{JSONObject out;try{out=MarketData.INSTANCE.fetch(symbol,period);}catch(Exception ex){out=error("Binance data unavailable, pair suspended, or source rate-limited. Try Refresh.");}deliver(id,out);});
        }
    }
    private static JSONObject error(String s){JSONObject j=new JSONObject();try{j.put("error",s);}catch(Exception ignored){}return j;}
    private void deliver(int id,JSONObject j){post(()->{if(!closed)evaluateJavascript("window.__fintechResult("+id+","+j.toString()+")",null);});}
    @Override public void destroy(){closed=true;worker.shutdownNow();removeJavascriptInterface("Fintech");super.destroy();}
}
