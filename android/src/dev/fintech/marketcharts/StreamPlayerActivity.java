package app.newview.dashboard;

import android.app.Activity;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.content.Intent;
import android.net.Uri;
import android.media.MediaPlayer;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.MediaController;
import android.widget.TextView;
import android.widget.VideoView;

/** User-selected HTTPS streams only. Fail visibly instead of freezing a TV screen. */
public final class StreamPlayerActivity extends Activity {
    private static final long PLAYBACK_TIMEOUT_MS=20000L;
    private final Handler mainHandler=new Handler(Looper.getMainLooper());
    private VideoView video;
    private TextView status;
    private Button retry;
    private Uri stream;
    private Runnable watchdog;
    private boolean stopped=false;
    private boolean resumePlayback=false;

    private boolean allowed(Uri uri) {
        if(uri==null||!"https".equalsIgnoreCase(uri.getScheme())||uri.getHost()==null
           ||uri.getUserInfo()!=null||uri.getPort()!=-1) return false;
        final String host=uri.getHost().toLowerCase(java.util.Locale.ROOT);
        // User-selected public streams should not target local device services.
        if(host.equals("localhost")||host.endsWith(".localhost")||host.equals("127.0.0.1")
           ||host.equals("0.0.0.0")||host.equals("::1")||host.equals("[::1]"))return false;
        return true;
    }
    private void cancelWatchdog() {
        if(watchdog!=null){mainHandler.removeCallbacks(watchdog);watchdog=null;}
    }
    private void showFailure(String message) {
        cancelWatchdog();
        status.setText(message);
        status.setVisibility(View.VISIBLE);
        retry.setVisibility(View.VISIBLE);
        retry.requestFocus();
    }
    private void armWatchdog(String message) {
        cancelWatchdog();
        final Runnable task=()->{
            if(!stopped&&video!=null){
                video.stopPlayback();
                showFailure(message+" Press Retry or Back.");
            }
        };
        watchdog=task;
        mainHandler.postDelayed(task,PLAYBACK_TIMEOUT_MS);
    }
    private void startPlayback() {
        if(stopped||video==null)return;
        retry.setVisibility(View.GONE);
        status.setText("Connecting to the selected stream…");
        status.setVisibility(View.VISIBLE);
        video.stopPlayback();
        armWatchdog("The stream did not respond within 20 seconds.");
        video.setVideoURI(stream);
        video.requestFocus();
    }
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        stream=getIntent().getData();
        if(!allowed(stream)){finish();return;}
        FrameLayout root=new FrameLayout(this);
        root.setBackgroundColor(0xff000000);
        video=new VideoView(this);
        root.addView(video,new FrameLayout.LayoutParams(-1,-1));
        LinearLayout feedback=new LinearLayout(this);
        feedback.setOrientation(LinearLayout.VERTICAL);
        feedback.setGravity(Gravity.CENTER);
        feedback.setPadding(32,24,32,24);
        status=new TextView(this);
        status.setTextColor(0xffffffff);
        status.setTextSize(18);
        status.setGravity(Gravity.CENTER);
        retry=new Button(this);
        retry.setText("Retry stream");
        retry.setVisibility(View.GONE);
        retry.setOnClickListener(v->startPlayback());
        feedback.addView(status,new LinearLayout.LayoutParams(-1,-2));
        feedback.addView(retry,new LinearLayout.LayoutParams(-2,-2));
        root.addView(feedback,new FrameLayout.LayoutParams(-1,-2,Gravity.CENTER));
        setContentView(root);
        MediaController controls=new MediaController(this);
        controls.setAnchorView(video);
        video.setMediaController(controls);
        video.setOnPreparedListener(mp->{
            cancelWatchdog();
            resumePlayback=false;
            status.setVisibility(View.GONE);
            video.start();
            controls.show(4000);
        });
        video.setOnInfoListener((mp,what,extra)->{
            if(what==MediaPlayer.MEDIA_INFO_BUFFERING_START){
                status.setText("Buffering live stream…");
                status.setVisibility(View.VISIBLE);
                armWatchdog("The stream stalled while buffering.");
            }else if(what==MediaPlayer.MEDIA_INFO_BUFFERING_END
                  ||what==MediaPlayer.MEDIA_INFO_VIDEO_RENDERING_START){
                cancelWatchdog();
                status.setVisibility(View.GONE);
            }
            return false;
        });
        video.setOnErrorListener((mp,what,extra)->{
            showFailure("This stream cannot play on this device or is unavailable. Try another channel or press Retry.");
            return true;
        });
        video.setOnCompletionListener(mp->showFailure("The selected stream ended. Press Retry or Back."));
        startPlayback();
    }
    @Override public boolean onKeyDown(int keyCode,KeyEvent event) {
        if(keyCode==KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE&&video!=null&&retry.getVisibility()!=View.VISIBLE){
            if(video.isPlaying())video.pause();else video.start();
            return true;
        }
        return super.onKeyDown(keyCode,event);
    }
    @Override protected void onPause(){
        resumePlayback=video!=null&&video.isPlaying()&&retry!=null&&retry.getVisibility()!=View.VISIBLE;
        cancelWatchdog();
        if(video!=null)video.pause();
        super.onPause();
    }
    @Override protected void onResume(){
        super.onResume();
        if(!stopped&&resumePlayback&&video!=null&&retry!=null&&retry.getVisibility()!=View.VISIBLE){
            resumePlayback=false;
            try{
                video.start();
                armWatchdog("Stream did not resume after returning to NewView.");
            }catch(RuntimeException e){
                showFailure("Stream could not resume. Press Retry or Back.");
            }
        }
    }
    @Override protected void onDestroy(){
        stopped=true;
        cancelWatchdog();
        if(video!=null)video.stopPlayback();
        super.onDestroy();
    }
}
