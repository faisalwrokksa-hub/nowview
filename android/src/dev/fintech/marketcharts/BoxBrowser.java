package app.newview.dashboard;

import android.content.Context;
import android.net.Uri;
import android.os.Build;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.widget.FrameLayout;

/** A separate top-level browser clipped to the dashboard's visible box.
 * Remote pages never receive the dashboard's privileged Javascript interfaces. */
final class BoxBrowser {
    private final ChartsView dashboard;
    private WebView browser;
    BoxBrowser(ChartsView owner){dashboard=owner;}
    private void create(){
        if(browser!=null)return;
        Context context=dashboard.getContext();browser=new WebView(context);
        WebSettings s=browser.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);s.setAllowContentAccess(false);
        s.setAllowFileAccessFromFileURLs(false);s.setAllowUniversalAccessFromFileURLs(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setSupportMultipleWindows(false);s.setJavaScriptCanOpenWindowsAutomatically(false);
        s.setMediaPlaybackRequiresUserGesture(true);s.setLoadWithOverviewMode(true);s.setUseWideViewPort(true);
        if(Build.VERSION.SDK_INT>=26)s.setSafeBrowsingEnabled(true);
        browser.setBackgroundColor(0xff0c1928);
        browser.setWebViewClient(new WebViewClient(){
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){return request.isForMainFrame()&&!NewsBrowserActivity.safePage(request.getUrl());}
            @Override public boolean shouldOverrideUrlLoading(WebView view,String url){return !NewsBrowserActivity.safePage(Uri.parse(url));}
        });
        browser.setWebChromeClient(new android.webkit.WebChromeClient());
        ((ViewGroup)dashboard.getParent()).addView(browser,new FrameLayout.LayoutParams(1,1));
        browser.setVisibility(View.GONE);
    }
    void open(String url,int x,int y,int width,int height,int viewport){
        if(!NewsBrowserActivity.safePage(Uri.parse(url))||dashboard.getParent()==null)return;
        create();bounds(x,y,width,height,viewport);browser.loadUrl(url);
    }
    void bounds(int x,int y,int width,int height,int viewport){
        if(browser==null||viewport<=0)return;
        float scale=(float)dashboard.getWidth()/viewport;
        int left=Math.max(0,Math.round(x*scale)),top=Math.max(0,Math.round(y*scale));
        int w=Math.min(Math.max(0,Math.round(width*scale)),dashboard.getWidth()-left);
        int h=Math.min(Math.max(0,Math.round(height*scale)),dashboard.getHeight()-top);
        if(w<4||h<4){browser.setVisibility(View.GONE);return;}
        FrameLayout.LayoutParams p=new FrameLayout.LayoutParams(w,h);p.leftMargin=left;p.topMargin=top;
        browser.setLayoutParams(p);browser.setVisibility(View.VISIBLE);browser.bringToFront();
    }
    void action(String action){
        if(browser==null)return;
        if("back".equals(action)&&browser.canGoBack())browser.goBack();
        else if("forward".equals(action)&&browser.canGoForward())browser.goForward();
        else if("reload".equals(action))browser.reload();
        else if("close".equals(action))close();
    }
    boolean back(){
        if(browser==null||browser.getVisibility()!=View.VISIBLE)return false;
        if(browser.canGoBack())browser.goBack();
        else{close();dashboard.evaluateJavascript("window.NewViewInternalBrowser&&window.NewViewInternalBrowser.close()",null);}
        return true;
    }
    void close(){if(browser!=null){browser.stopLoading();browser.loadUrl("about:blank");browser.setVisibility(View.GONE);dashboard.requestFocus();}}
    void pause(){if(browser!=null)browser.onPause();}
    void resume(){if(browser!=null)browser.onResume();}
    void destroy(){if(browser!=null){((ViewGroup)browser.getParent()).removeView(browser);browser.destroy();browser=null;}}
}
