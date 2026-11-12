package app.newview.dashboard;

import android.app.Activity;
import android.os.Bundle;
import android.os.Build;
import android.content.Intent;
import android.app.AlertDialog;
import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONObject;
import android.graphics.Color;
import android.graphics.Bitmap;
import android.net.Uri;
import android.view.KeyEvent;
import android.view.View;
import android.view.inputmethod.EditorInfo;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceError;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/** Isolated TV-friendly browser. Never exposes NewViewNative/LauncherApps JS bridges. */
public final class NewsBrowserActivity extends Activity {
    private WebView browser;
    private EditText address;
    private TextView pageStatus;
    private static final String START="https://www.youtube.com/";
    private static final String BOOKMARK_PREFS="newview.browser.bookmarks.v1";
    private Button bookmarkButton;

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
            if(safePage(target)){pageStatus.setVisibility(View.GONE);browser.loadUrl(target.toString());}
            else address.setError("HTTPS public websites only");
        }catch(Exception ignored){address.setError("Invalid website address");}
    }
    private JSONArray savedBookmarks(){
        try{return new JSONArray(getSharedPreferences(BOOKMARK_PREFS,MODE_PRIVATE).getString("items","[]"));}
        catch(Exception ignored){return new JSONArray();}
    }
    private void storeBookmarks(JSONArray items){
        getSharedPreferences(BOOKMARK_PREFS,MODE_PRIVATE).edit().putString("items",items.toString()).apply();
    }
    private String currentPage(){
        String value=browser==null?null:browser.getUrl();
        try{return safePage(Uri.parse(value))?value:null;}catch(Exception ignored){return null;}
    }
    private void updateBookmarkButton(){
        if(bookmarkButton==null)return;
        String url=currentPage();boolean saved=false;
        JSONArray items=savedBookmarks();
        for(int i=0;i<items.length();i++){if(url!=null&&url.equals(items.optJSONObject(i)==null?null:items.optJSONObject(i).optString("url")))saved=true;}
        bookmarkButton.setText(saved?"★":"☆");
        bookmarkButton.setContentDescription(saved?"Remove current bookmark":"Bookmark current page");
    }
    private void toggleBookmark(){
        String url=currentPage();if(url==null)return;
        JSONArray items=savedBookmarks(),next=new JSONArray();boolean removed=false;
        for(int i=0;i<items.length();i++){
            JSONObject entry=items.optJSONObject(i);
            if(entry==null)continue;
            if(url.equals(entry.optString("url"))){removed=true;continue;}
            next.put(entry);
        }
        if(!removed){
            if(next.length()>=100){new AlertDialog.Builder(this).setMessage("Maximum 100 bookmarks").setPositiveButton("OK",null).show();return;}
            JSONObject entry=new JSONObject();
            try{
                String title=browser.getTitle();
                entry.put("url",url);
                entry.put("title",title==null||title.trim().isEmpty()?Uri.parse(url).getHost():title.substring(0,Math.min(100,title.length())));
                next.put(entry);
            }catch(Exception ignored){return;}
        }
        storeBookmarks(next);updateBookmarkButton();
    }
    private void showBookmarks(){
        JSONArray saved=savedBookmarks();
        if(saved.length()==0){new AlertDialog.Builder(this).setTitle("Bookmarks").setMessage("No saved pages yet").setPositiveButton("Close",null).show();return;}
        String[] labels=new String[saved.length()];
        for(int i=0;i<saved.length();i++){
            JSONObject entry=saved.optJSONObject(i);
            labels[i]=entry==null?"Unknown":entry.optString("title",entry.optString("url"));
        }
        new AlertDialog.Builder(this).setTitle("Saved pages").setItems(labels,(dialog,index)->{
            JSONObject entry=saved.optJSONObject(index);
            if(entry!=null){String url=entry.optString("url");try{if(safePage(Uri.parse(url)))browser.loadUrl(url);}catch(Exception ignored){}}
        }).setNegativeButton("Close",null).show();
    }
    @Override public void onCreate(Bundle state){
        super.onCreate(state);
        LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.rgb(9,15,26));
        getWindow().setStatusBarColor(Color.rgb(9,15,26));
        getWindow().setNavigationBarColor(Color.rgb(9,15,26));
        LinearLayout toolbar=new LinearLayout(this);toolbar.setOrientation(LinearLayout.HORIZONTAL);
        toolbar.setBackgroundColor(Color.rgb(17,28,43));
        Button back=button("◀"),forward=button("▶"),refresh=button("↻"),retry=button("Retry"),bookmarks=button("Bookmarks"),close=button("Close");
        bookmarkButton=button("☆");
        address=new EditText(this);address.setSingleLine(true);address.setTextColor(Color.WHITE);
        address.setHint("Search or enter HTTPS website");address.setHintTextColor(Color.LTGRAY);
        address.setBackgroundTintList(android.content.res.ColorStateList.valueOf(Color.rgb(205,165,92)));
        address.setInputType(android.text.InputType.TYPE_CLASS_TEXT|android.text.InputType.TYPE_TEXT_VARIATION_URI);
        address.setImeOptions(EditorInfo.IME_ACTION_GO);
        toolbar.addView(back);toolbar.addView(forward);
        toolbar.addView(address,new LinearLayout.LayoutParams(0,-2,1));
        toolbar.addView(refresh);toolbar.addView(retry);toolbar.addView(bookmarkButton);toolbar.addView(bookmarks);toolbar.addView(close);
        root.addView(toolbar);
        pageStatus=new TextView(this);
        pageStatus.setTextColor(Color.WHITE);
        pageStatus.setBackgroundColor(Color.rgb(98,49,39));
        pageStatus.setPadding(18,12,18,12);
        pageStatus.setText("Website loading unavailable. Choose Retry or another address.");
        pageStatus.setVisibility(View.GONE);
        root.addView(pageStatus);
        browser=new WebView(this);browser.setFocusable(true);browser.setFocusableInTouchMode(true);
        root.addView(browser,new LinearLayout.LayoutParams(-1,0,1));
        setContentView(root);
        WebSettings settings=browser.getSettings();
        settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);
        // Prefer dark pages where WebView and publisher support the system preference.
        // Algorithmic darkening is best effort; publisher-controlled rendering can remain light.
        if(Build.VERSION.SDK_INT>=33)settings.setAlgorithmicDarkeningAllowed(true);
        else if(Build.VERSION.SDK_INT>=29)settings.setForceDark(WebSettings.FORCE_DARK_ON);
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
            // Frame-policy restrictions do not apply to top-level navigation in
            // this isolated WebView. Do not add any privileged JavascriptInterface.
            @Override public void onPageStarted(WebView view,String url,Bitmap favicon){
                pageStatus.setVisibility(View.GONE);
                address.setText(url);
            }
            @Override public void onReceivedError(WebView view,WebResourceRequest request,WebResourceError error){
                if(request.isForMainFrame()){
                    pageStatus.setText("The website could not load. Check the connection and choose Retry, or open another public HTTPS address.");
                    pageStatus.setVisibility(View.VISIBLE);
                }
            }
            @Override public void onReceivedHttpError(WebView view,WebResourceRequest request,WebResourceResponse response){
                if(request.isForMainFrame()&&response.getStatusCode()>=400){
                    pageStatus.setText("Publisher returned HTTP "+response.getStatusCode()+". Choose Retry or open another page.");
                    pageStatus.setVisibility(View.VISIBLE);
                }
            }
            @Override public void onPageFinished(WebView view,String url){
                address.setText(url);
                updateBookmarkButton();
            }
        });
        back.setOnClickListener(v->{if(browser.canGoBack())browser.goBack();});
        forward.setOnClickListener(v->{if(browser.canGoForward())browser.goForward();});
        refresh.setOnClickListener(v->browser.reload());
        retry.setOnClickListener(v->{pageStatus.setVisibility(View.GONE);browser.reload();});
        bookmarkButton.setOnClickListener(v->toggleBookmark());
        bookmarks.setOnClickListener(v->showBookmarks());
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
        Button b=new Button(this);b.setText(label);b.setMinimumWidth(54);b.setMinHeight(56);
        b.setTextColor(Color.WHITE);b.setBackgroundTintList(android.content.res.ColorStateList.valueOf(Color.rgb(36,58,75)));
        b.setFocusable(true);return b;
    }
    @Override public void onBackPressed(){if(browser!=null&&browser.canGoBack())browser.goBack();else super.onBackPressed();}
    @Override protected void onPause(){if(browser!=null)browser.onPause();super.onPause();}
    @Override protected void onResume(){super.onResume();if(browser!=null)browser.onResume();}
    @Override protected void onDestroy(){if(browser!=null){browser.stopLoading();browser.destroy();browser=null;}super.onDestroy();}
}
