package app.newview.dashboard;
import android.app.Activity;
import android.os.Bundle;
import android.content.Intent;
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
    @Override protected void onActivityResult(int requestCode,int resultCode,Intent data){
        super.onActivityResult(requestCode,resultCode,data);
        if(web!=null)web.handleActivityResult(requestCode,resultCode,data);
    }
    @Override public void onBackPressed(){
        if(web!=null&&web.handleBoxBrowserBack())return;
        if(web==null){super.onBackPressed();return;}
        web.evaluateJavascript("Boolean(typeof window.NewViewBack==='function' && window.NewViewBack())",result->{
            if(!"true".equals(result))finishOnBack();
        });
    }
    private void finishOnBack(){super.onBackPressed();}
    @Override protected void onDestroy(){if(web!=null)web.destroy();super.onDestroy();}
}
