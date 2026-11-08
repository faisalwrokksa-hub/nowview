package app.newview.dashboard;
import android.content.Context;
import android.content.Intent;
import android.app.Activity;
import android.net.Uri;
import android.os.Build;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
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
    private static final int CSV_PICKER_REQUEST=2307;
    private ValueCallback<Uri[]> pendingFiles;
    public ChartsView(Context context,boolean compact){
        super(context);WebSettings s=getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setAllowFileAccess(false);s.setAllowContentAccess(true);s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setAllowFileAccessFromFileURLs(false);
        s.setAllowUniversalAccessFromFileURLs(false);
        s.setSupportMultipleWindows(false);
        if(Build.VERSION.SDK_INT>=26)s.setSafeBrowsingEnabled(true);
        setWebContentsDebuggingEnabled(false);
        setBackgroundColor(0xff080c13);
        setWebViewClient(new WebViewClient(){
            @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){
                // Subframes must never cause an external app launch.
                if(!r.isForMainFrame())return true;
                // Never launch another app on automatic redirects or script navigation.
                if(!r.hasGesture()&&!isInternal(r.getUrl()))return true;
                return routeNavigation(r.getUrl());
            }
            @Override public boolean shouldOverrideUrlLoading(WebView v,String u){return routeNavigation(Uri.parse(u));}
        });
        setWebChromeClient(new WebChromeClient(){
            @Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> callback,FileChooserParams params){
                if(!(getContext() instanceof Activity)){callback.onReceiveValue(null);return true;}
                if(pendingFiles!=null)pendingFiles.onReceiveValue(null);
                pendingFiles=callback;
                Intent pick=new Intent(Intent.ACTION_OPEN_DOCUMENT);
                pick.addCategory(Intent.CATEGORY_OPENABLE);
                pick.setType("text/*");
                pick.putExtra(Intent.EXTRA_MIME_TYPES,new String[]{"text/csv","text/comma-separated-values","application/csv","text/plain"});
                try{((Activity)getContext()).startActivityForResult(pick,CSV_PICKER_REQUEST);}
                catch(Exception ignored){pendingFiles=null;callback.onReceiveValue(null);}
                return true;
            }
        });
        addJavascriptInterface(new Bridge(),"NewViewNative");loadUrl("file:///android_asset/index.html"+(compact?"?home=1":""));
    }
    private static boolean isInternal(Uri uri){
        return uri!=null&&"file".equals(uri.getScheme())&&(uri.getAuthority()==null||uri.getAuthority().isEmpty())
            &&"/android_asset/index.html".equals(uri.getPath());
    }
    private static boolean approvedUrl(Uri uri){
        if(uri==null||!"https".equalsIgnoreCase(uri.getScheme())||uri.getUserInfo()!=null||uri.getPort()!=-1)return false;
        String host=uri.getHost();
        if(host==null)return false;
        host=host.toLowerCase(java.util.Locale.ROOT);
        return host.equals("x.com")||host.equals("www.x.com")
            ||host.equals("www.tiktok.com")||host.equals("tiktok.com")
            ||host.equals("www.facebook.com")||host.equals("facebook.com")
            ||host.equals("www.youtube.com")||host.equals("youtube.com")||host.equals("youtu.be")
            ||host.equals("www.sec.gov")||host.equals("www.federalreserve.gov");
    }
    private boolean routeNavigation(Uri uri){
        if(isInternal(uri))return false;
        if(approvedUrl(uri))openApprovedUri(uri);
        return true; // Block every other top-level URL in the app WebView.
    }
    private void openApprovedUri(Uri uri){
        if(!approvedUrl(uri))return;
        post(()->{
            if(closed)return;
            try{
                Intent intent=new Intent(Intent.ACTION_VIEW,uri);
                intent.addCategory(Intent.CATEGORY_BROWSABLE);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
            }catch(Exception ignored){}
        });
    }
    public void handleActivityResult(int request,int result,Intent data){
        if(request!=CSV_PICKER_REQUEST)return;
        ValueCallback<Uri[]> callback=pendingFiles;pendingFiles=null;
        if(callback==null)return;
        Uri chosen=result==Activity.RESULT_OK&&data!=null?data.getData():null;
        // Only expose a single system-provider document, never a raw file or network URI.
        if(chosen!=null&&!"content".equals(chosen.getScheme()))chosen=null;
        callback.onReceiveValue(chosen==null?null:new Uri[]{chosen});
    }
    public final class Bridge {
        @JavascriptInterface public void openApprovedUrl(String raw){
            if(raw==null||raw.length()>2048)return;
            try{openApprovedUri(Uri.parse(raw));}catch(Exception ignored){}
        }
        @JavascriptInterface public boolean isPipeTvInstalled(){
            return getContext().getPackageManager().getLaunchIntentForPackage("dev.limitedio.pipetv")!=null;
        }
        @JavascriptInterface public void openPipeTv(){
            post(()->{
                if(closed)return;
                Intent intent=getContext().getPackageManager().getLaunchIntentForPackage("dev.limitedio.pipetv");
                if(intent==null)return;
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                try{getContext().startActivity(intent);}catch(Exception ignored){}
            });
        }
        @JavascriptInterface public boolean getPanelReady(){String enabled=android.provider.Settings.Secure.getString(getContext().getContentResolver(),android.provider.Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES);return android.provider.Settings.canDrawOverlays(getContext())&&enabled!=null&&(enabled.contains("app.newview.dashboard/.HomePanelService")||enabled.contains("app.newview.dashboard/app.newview.dashboard.HomePanelService"));}
        @JavascriptInterface public boolean getPanelEnabled(){return getContext().getSharedPreferences("charts",0).getBoolean("homePanel",false);}
        @JavascriptInterface public void setPanelEnabled(boolean enabled){getContext().getSharedPreferences("charts",0).edit().putBoolean("homePanel",enabled).apply();if(!enabled)post(HomePanelService::hidePanel);}
        @JavascriptInterface public void requestChart(final String symbol,final String period,final int id){
            if(!Arrays.asList(MarketData.SYMBOLS).contains(symbol)||!Arrays.asList(MarketData.RANGES).contains(period)){deliver(id,error("Unsupported token or range"));return;}
            if(closed)return;
            worker.execute(()->{JSONObject out;try{out=MarketData.INSTANCE.fetch(symbol,period);}catch(Exception ex){out=error("Binance data unavailable, pair suspended, or source rate-limited. Try Refresh.");}deliver(id,out);});
        }
    }
    private static JSONObject error(String s){JSONObject j=new JSONObject();try{j.put("error",s);}catch(Exception ignored){}return j;}
    private void deliver(int id,JSONObject j){post(()->{if(!closed)evaluateJavascript("window.__newviewResult("+id+","+j.toString()+")",null);});}
    @Override public void destroy(){closed=true;worker.shutdownNow();if(pendingFiles!=null){pendingFiles.onReceiveValue(null);pendingFiles=null;}removeJavascriptInterface("NewViewNative");super.destroy();}
}
