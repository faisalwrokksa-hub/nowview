package app.newview.dashboard;

import android.app.Activity;
import android.os.Bundle;
import android.os.Build;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.view.KeyEvent;
import android.view.View;
import android.view.inputmethod.EditorInfo;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/** Isolated TV-friendly browser. Never exposes NewViewNative/LauncherApps JS bridges. */
public final class NewsBrowserActivity extends Activity {
    private WebView browser;
    private EditText address;
    private static final String START="https://www.bbc.com/news";

    public static boolean safePage(Uri u){
        if(u==null||!"https".equalsIgnoreCase(u.getScheme())||u.getHost()==null||
           u.getUserInfo()!=null||u.getPort()!=-1)return false;
        String host=u.getHost().toLowerCase(java.util.Locale.ROOT);
        if(host.matches("[0-9.]+")||host.contains(":")||!host.contains("."))return false;
        return !host.equals("localhost")&&!host.endsWith(".localhost")&&
               !host.equals("127.0.0.1")&&!host.equals("0.0.0.0")&&
               !host.equals("[::1]")&&!host.equals("::1")&&
               !host.endsWith(".local")&&!host.endsWith(".internal");
    }
    private void navigate(String raw){
        try{
            String trimmed=raw==null?"":raw.trim();
            if(!trimmed.startsWith("https://"))trimmed="https://"+trimmed;
            Uri target=Uri.parse(trimmed);
            if(safePage(target))browser.loadUrl(target.toString());
            else address.setError("HTTPS public websites only");
        }catch(Exception ignored){address.setError("Invalid website address");}
    }
    @Override public void onCreate(Bundle state){
        super.onCreate(state);
        LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.rgb(9,15,26));
        LinearLayout toolbar=new LinearLayout(this);toolbar.setOrientation(LinearLayout.HORIZONTAL);
        Button back=button("◀"),forward=button("▶"),refresh=button("↻"),close=button("Close");
        address=new EditText(this);address.setSingleLine(true);address.setTextColor(Color.WHITE);
        address.setHint("https://…");address.setHintTextColor(Color.LTGRAY);
        address.setInputType(android.text.InputType.TYPE_CLASS_TEXT|android.text.InputType.TYPE_TEXT_VARIATION_URI);
        address.setImeOptions(EditorInfo.IME_ACTION_GO);
        toolbar.addView(back);toolbar.addView(forward);
        toolbar.addView(address,new LinearLayout.LayoutParams(0,-2,1));
        toolbar.addView(refresh);toolbar.addView(close);
        root.addView(toolbar);
        browser=new WebView(this);browser.setFocusable(true);browser.setFocusableInTouchMode(true);
        root.addView(browser,new LinearLayout.LayoutParams(-1,0,1));
        setContentView(root);
        WebSettings settings=browser.getSettings();
        settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportMultipleWindows(false);settings.setJavaScriptCanOpenWindowsAutomatically(false);
        if(Build.VERSION.SDK_INT>=26)settings.setSafeBrowsingEnabled(true);
        browser.setWebViewClient(new WebViewClient(){
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){
                if(!request.isForMainFrame())return false;
                if(!safePage(request.getUrl()))return true;
                return false;
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view,String url){
                try{return !safePage(Uri.parse(url));}catch(Exception ignored){return true;}
            }
            @Override public void onPageFinished(WebView view,String url){
                address.setText(url);
            }
        });
        back.setOnClickListener(v->{if(browser.canGoBack())browser.goBack();});
        forward.setOnClickListener(v->{if(browser.canGoForward())browser.goForward();});
        refresh.setOnClickListener(v->browser.reload());
        close.setOnClickListener(v->finish());
        address.setOnEditorActionListener((v,action,event)->{
            if(action==EditorInfo.IME_ACTION_GO||(event!=null&&event.getKeyCode()==KeyEvent.KEYCODE_ENTER)){
                navigate(address.getText().toString());browser.requestFocus();return true;
            }return false;
        });
        Intent intent=getIntent();
        Uri requested=intent==null?null:intent.getData();
        navigate(safePage(requested)?requested.toString():START);
        browser.requestFocus();
    }
    private Button button(String label){
        Button b=new Button(this);b.setText(label);b.setMinimumWidth(54);b.setMinHeight(56);b.setFocusable(true);return b;
    }
    @Override public void onBackPressed(){if(browser!=null&&browser.canGoBack())browser.goBack();else super.onBackPressed();}
    @Override protected void onPause(){if(browser!=null)browser.onPause();super.onPause();}
    @Override protected void onResume(){super.onResume();if(browser!=null)browser.onResume();}
    @Override protected void onDestroy(){if(browser!=null){browser.stopLoading();browser.destroy();browser=null;}super.onDestroy();}
}
