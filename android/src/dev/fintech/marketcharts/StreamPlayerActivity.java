package app.newview.dashboard;

import android.app.Activity;
import android.os.Bundle;
import android.content.Intent;
import android.net.Uri;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.widget.FrameLayout;
import android.widget.MediaController;
import android.widget.TextView;
import android.widget.VideoView;

/** Native Android stream playback. Only user-selected HTTPS streams are accepted. */
public final class StreamPlayerActivity extends Activity {
    private VideoView video;
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        Uri uri=getIntent().getData();
        if(uri==null||!"https".equalsIgnoreCase(uri.getScheme())||uri.getHost()==null
           ||uri.getUserInfo()!=null||uri.getPort()!=-1){finish();return;}
        FrameLayout root=new FrameLayout(this);
        root.setBackgroundColor(0xff000000);
        video=new VideoView(this);
        root.addView(video,new FrameLayout.LayoutParams(-1,-1));
        TextView error=new TextView(this);
        error.setTextColor(0xffffffff);
        error.setTextSize(18);
        error.setPadding(32,24,32,24);
        error.setGravity(Gravity.CENTER);
        error.setVisibility(View.GONE);
        root.addView(error,new FrameLayout.LayoutParams(-1,-2,Gravity.CENTER));
        setContentView(root);
        MediaController controls=new MediaController(this);
        controls.setAnchorView(video);
        video.setMediaController(controls);
        video.setOnPreparedListener(mp->{mp.setScreenOnWhilePlaying(true);video.start();controls.show(4000);});
        video.setOnErrorListener((mp,what,extra)->{
            error.setText("This stream cannot be played on this device. Check the channel format or availability. Press Back to return.");
            error.setVisibility(View.VISIBLE);
            return true;
        });
        video.setVideoURI(uri);
        video.requestFocus();
    }
    @Override public boolean onKeyDown(int keyCode,KeyEvent event){
        if(keyCode==KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE&&video!=null){
            if(video.isPlaying())video.pause();else video.start();return true;
        }
        return super.onKeyDown(keyCode,event);
    }
    @Override protected void onPause(){if(video!=null)video.pause();super.onPause();}
    @Override protected void onDestroy(){if(video!=null)video.stopPlayback();super.onDestroy();}
}
