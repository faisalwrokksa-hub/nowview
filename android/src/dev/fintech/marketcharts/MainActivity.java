package dev.fintech.marketcharts;
import android.app.Activity;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;

public final class MainActivity extends Activity {
    private ChartsView web;
    @Override public void onCreate(Bundle state){
        super.onCreate(state);getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN|View.SYSTEM_UI_FLAG_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
        web=new ChartsView(this,false);setContentView(web);web.requestFocus();
    }
    @Override protected void onResume(){super.onResume();HomePanelService.hidePanel();if(web!=null)web.onResume();}
    @Override protected void onPause(){super.onPause();if(web!=null)web.onPause();}
    @Override protected void onDestroy(){if(web!=null)web.destroy();super.onDestroy();}
}
