package dev.fintech.marketcharts;
import android.accessibilityservice.AccessibilityService;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.graphics.PixelFormat;
import android.os.Build;
import android.provider.Settings;
import android.view.Gravity;
import android.view.WindowManager;
import android.view.accessibility.AccessibilityEvent;

/** Checks foreground package/window class only. Never retrieves window content or text. */
public final class HomePanelService extends AccessibilityService {
    private static HomePanelService active;
    private ChartsView panel;
    private WindowManager manager;
    private final BroadcastReceiver off=new BroadcastReceiver(){@Override public void onReceive(Context c,Intent i){hide();}};
    public static void hidePanel(){if(active!=null)active.hide();}
    @Override protected void onServiceConnected(){
        active=this;manager=(WindowManager)getSystemService(WINDOW_SERVICE);
        if(Build.VERSION.SDK_INT>=33)registerReceiver(off,new IntentFilter(Intent.ACTION_SCREEN_OFF),Context.RECEIVER_NOT_EXPORTED);
        else registerReceiver(off,new IntentFilter(Intent.ACTION_SCREEN_OFF));
    }
    @Override public void onAccessibilityEvent(AccessibilityEvent event){
        if(event.getEventType()!=AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED||event.getPackageName()==null)return;
        String pkg=event.getPackageName().toString(),type=event.getClassName()==null?"":event.getClassName().toString();
        if(pkg.equals(getPackageName()))return; // Full-screen activity hides explicitly; ignore the panel's own window.
        if(pkg.equals("dev.plume")&&!type.contains("Dialog")&&!type.contains("Popup"))show();else hide();
    }
    private void show(){
        if(panel!=null||!Settings.canDrawOverlays(this)||!getSharedPreferences("charts",0).getBoolean("homePanel",true))return;
        int w=getResources().getDisplayMetrics().widthPixels,h=getResources().getDisplayMetrics().heightPixels;
        WindowManager.LayoutParams p=new WindowManager.LayoutParams((int)(w*.90),(int)(h*.46),WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE|WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE,PixelFormat.TRANSLUCENT);
        p.gravity=Gravity.TOP|Gravity.CENTER_HORIZONTAL;p.y=(int)(h*.22);p.alpha=.8f;
        panel=new ChartsView(this,true);
        try{manager.addView(panel,p);}catch(RuntimeException error){panel.destroy();panel=null;}
    }
    private void hide(){if(panel!=null){ChartsView previous=panel;panel=null;try{manager.removeView(previous);}catch(RuntimeException ignored){}previous.destroy();}}
    @Override public void onInterrupt(){hide();}
    @Override public void onDestroy(){hide();try{unregisterReceiver(off);}catch(RuntimeException ignored){}if(active==this)active=null;super.onDestroy();}
}
