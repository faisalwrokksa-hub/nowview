package app.newview.phonecaster;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.projection.MediaProjection;
import android.media.projection.MediaProjectionManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.ResultReceiver;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import org.json.JSONObject;
import org.webrtc.DefaultVideoDecoderFactory;
import org.webrtc.DefaultVideoEncoderFactory;
import org.webrtc.EglBase;
import org.webrtc.MediaConstraints;
import org.webrtc.MediaStream;
import org.webrtc.PeerConnection;
import org.webrtc.PeerConnectionFactory;
import org.webrtc.RtpReceiver;
import org.webrtc.SdpObserver;
import org.webrtc.ScreenCapturerAndroid;
import org.webrtc.SessionDescription;
import org.webrtc.SurfaceTextureHelper;
import org.webrtc.VideoSource;
import org.webrtc.VideoTrack;
import org.webrtc.IceCandidate;
import org.webrtc.DataChannel;

import java.lang.ref.WeakReference;
import java.util.Collections;
import java.util.List;

/**
 * Consent-based Android phone sender for NewView's manual SDP WebRTC viewer.
 * The user pastes the TV's offer, approves Android's MediaProjection dialog,
 * then copies the resulting answer back to the TV. LAN ICE only, video only.
 * No automation, persistent access, remote commands, or device pairing credentials.
 */
public final class CasterActivity extends Activity {
    private static final int CAPTURE_REQUEST=4102, NOTICE_REQUEST=4103;
    private static final long MAX_SESSION_MS=30*60*1000L, ICE_TIMEOUT_MS=15000L;
    private static WeakReference<CasterActivity> active=new WeakReference<>(null);
    private final Handler handler=new Handler(Looper.getMainLooper());
    private EditText offer,answer;
    private TextView status;
    private Button start,stop;
    private PeerConnectionFactory factory;
    private PeerConnection peer;
    private ScreenCapturerAndroid capturer;
    private SurfaceTextureHelper textureHelper;
    private VideoSource source;
    private VideoTrack videoTrack;
    private EglBase egl;
    private SessionDescription remoteOffer;
    private boolean sharing=false,stopping=false,initialized=false;
    private final Runnable expire=()->{stopCasting();show("Session expired after 30 minutes. Reconnect to share again.");};
    private final Runnable iceTimeout=()->{if(sharing&&answer.getText().length()==0){stopCasting();show("LAN connection setup timed out. Recreate the TV offer.");}};

    public static void stopActiveCapture(){
        CasterActivity activity=active.get();
        if(activity!=null)activity.runOnUiThread(activity::stopCasting);
    }
    @Override public void onCreate(Bundle saved){
        super.onCreate(saved);
        active=new WeakReference<>(this);
        LinearLayout main=new LinearLayout(this);main.setOrientation(LinearLayout.VERTICAL);
        main.setPadding(24,24,24,24);
        TextView title=new TextView(this);title.setText("NewView · Phone screen cast");title.setTextSize(23f);
        TextView info=new TextView(this);info.setText("1. On your TV open NewViewDevice → Watch another screen.\n2. Copy the TV connection offer below.\n3. Tap Start, approve Android screen sharing, then copy the generated answer back to your TV.\n\nLAN-only video; no audio or remote control. Stop sharing at any time.");
        offer=new EditText(this);offer.setHint("Paste TV WebRTC offer (JSON)");offer.setSingleLine(false);offer.setMinLines(4);offer.setMaxLines(8);
        answer=new EditText(this);answer.setHint("Connection answer appears here");answer.setSingleLine(false);answer.setMinLines(4);answer.setMaxLines(8);answer.setTextIsSelectable(true);answer.setFocusable(false);
        start=new Button(this);start.setText("Start screen sharing · Android permission required");
        stop=new Button(this);stop.setText("Stop sharing");stop.setEnabled(false);
        Button copy=new Button(this);copy.setText("Copy answer");
        status=new TextView(this);status.setText("Not sharing");status.setTextSize(16f);
        main.addView(title);main.addView(info);main.addView(offer);main.addView(start);main.addView(answer);main.addView(copy);main.addView(stop);main.addView(status);
        ScrollView scroll=new ScrollView(this);scroll.addView(main,new ScrollView.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,ViewGroup.LayoutParams.WRAP_CONTENT));setContentView(scroll);
        start.setOnClickListener(v->requestCapture());
        stop.setOnClickListener(v->stopCasting());
        copy.setOnClickListener(v->{
            String code=answer.getText().toString();
            if(code.isEmpty()){show("No answer yet: finish the screen-share permission step.");return;}
            android.content.ClipboardManager clipboard=(android.content.ClipboardManager)getSystemService(CLIPBOARD_SERVICE);
            clipboard.setPrimaryClip(android.content.ClipData.newPlainText("NewView TV answer",code));
            show("Answer copied. Paste it on your TV to finish the private LAN connection.");
        });
    }
    private void show(String value){runOnUiThread(()->{if(status!=null)status.setText(value);});}
    private SessionDescription parseOffer(String text)throws Exception{
        if(text==null||text.length()>120000)throw new Exception("Invalid or oversized TV offer");
        JSONObject json=new JSONObject(text);
        if(!"offer".equals(json.optString("type")))throw new Exception("TV offer must have type=offer");
        String sdp=json.optString("sdp","");
        if(sdp.length()<50||sdp.length()>120000||!sdp.startsWith("v=0")||!sdp.contains("m=video "))throw new Exception("Not a valid video offer");
        if(sdp.contains("m=application "))throw new Exception("Remote-control data channels are not allowed");
        return new SessionDescription(SessionDescription.Type.OFFER,sdp);
    }
    private void requestCapture(){
        if(sharing)return;
        if(Build.VERSION.SDK_INT>=33&&checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED){
            requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS},NOTICE_REQUEST);
            return;
        }
        try{
            remoteOffer=parseOffer(offer.getText().toString());
            MediaProjectionManager manager=(MediaProjectionManager)getSystemService(Context.MEDIA_PROJECTION_SERVICE);
            if(manager==null)throw new Exception("Screen capture is unsupported");
            startActivityForResult(manager.createScreenCaptureIntent(),CAPTURE_REQUEST);
        }catch(Exception error){show(error.getMessage());}
    }
    @Override public void onRequestPermissionsResult(int requestCode,String[] permissions,int[] grantResults){
        super.onRequestPermissionsResult(requestCode,permissions,grantResults);
        if(requestCode!=NOTICE_REQUEST)return;
        if(grantResults.length==0||grantResults[0]!=PackageManager.PERMISSION_GRANTED){
            show("Notification permission is required to display an always-visible Stop sharing action. Nothing was captured.");
            return;
        }
        requestCapture();
    }
    @Override protected void onActivityResult(int requestCode,int resultCode,Intent data){
        super.onActivityResult(requestCode,resultCode,data);
        if(requestCode!=CAPTURE_REQUEST)return;
        if(resultCode!=RESULT_OK||data==null){show("Screen-sharing permission denied. Nothing was transmitted.");return;}
        if(sharing)return;
        // Android 14+ requires foreground service to be running BEFORE capture begins.
        Intent service=new Intent(this,ProjectionNoticeService.class).setAction(ProjectionNoticeService.ACTION_START);
        service.putExtra(ProjectionNoticeService.EXTRA_RECEIVER,new ResultReceiver(handler){
            @Override protected void onReceiveResult(int code,Bundle result){
                if(code!=1){show("Could not start the visible screen-share notification.");return;}
                beginCapture(data);
            }
        });
        try{
            if(Build.VERSION.SDK_INT>=26)startForegroundService(service);else startService(service);
        }catch(RuntimeException error){show("Screen-sharing service could not start.");}
    }
    private void beginCapture(Intent permission){
        if(sharing||stopping||remoteOffer==null)return;
        try{
            sharing=true;start.setEnabled(false);stop.setEnabled(true);offer.setEnabled(false);
            answer.setText("");handler.postDelayed(expire,MAX_SESSION_MS);
            PeerConnectionFactory.initialize(PeerConnectionFactory.InitializationOptions.builder(getApplicationContext()).createInitializationOptions());
            initialized=true;
            egl=EglBase.create();
            factory=PeerConnectionFactory.builder()
                .setVideoEncoderFactory(new DefaultVideoEncoderFactory(egl.getEglBaseContext(),true,true))
                .setVideoDecoderFactory(new DefaultVideoDecoderFactory(egl.getEglBaseContext()))
                .createPeerConnectionFactory();
            PeerConnection.RTCConfiguration config=new PeerConnection.RTCConfiguration(Collections.emptyList());
            peer=factory.createPeerConnection(config,new PeerConnection.Observer(){
                @Override public void onSignalingChange(PeerConnection.SignalingState state){}
                @Override public void onIceConnectionChange(PeerConnection.IceConnectionState state){
                    if(state==PeerConnection.IceConnectionState.CONNECTED||state==PeerConnection.IceConnectionState.COMPLETED)show("Connected to TV · live screen sharing");
                    if(state==PeerConnection.IceConnectionState.FAILED||state==PeerConnection.IceConnectionState.CLOSED)
                        runOnUiThread(()->{stopCasting();show("WebRTC connection ended. Screen capture stopped.");});
                }
                @Override public void onIceConnectionReceivingChange(boolean change){}
                @Override public void onIceGatheringChange(PeerConnection.IceGatheringState state){
                    if(state==PeerConnection.IceGatheringState.COMPLETE)runOnUiThread(()->publishAnswer());
                }
                @Override public void onIceCandidate(IceCandidate candidate){}
                @Override public void onIceCandidatesRemoved(IceCandidate[] candidates){}
                @Override public void onAddStream(MediaStream stream){}
                @Override public void onRemoveStream(MediaStream stream){}
                @Override public void onDataChannel(DataChannel channel){if(channel!=null)channel.close();}
                @Override public void onRenegotiationNeeded(){}
                @Override public void onAddTrack(RtpReceiver receiver,MediaStream[] streams){}
            });
            if(peer==null)throw new IllegalStateException("Could not initialize WebRTC");
            capturer=new ScreenCapturerAndroid(permission,new MediaProjection.Callback(){
                @Override public void onStop(){runOnUiThread(()->{stopCasting();show("Android ended screen-sharing permission.");});}
            });
            textureHelper=SurfaceTextureHelper.create("NewViewPhoneCapture",egl.getEglBaseContext());
            if(textureHelper==null)throw new IllegalStateException("Video capture unavailable");
            source=factory.createVideoSource(true);
            capturer.initialize(textureHelper,getApplicationContext(),source.getCapturerObserver());
            capturer.startCapture(960,540,15);
            videoTrack=factory.createVideoTrack("NewViewPhoneScreen",source);
            peer.addTrack(videoTrack,Collections.singletonList("NewViewScreen"));
            show("Screen capture active; generating private TV answer…");
            PeerConnection current=peer;
            current.setRemoteDescription(observer(()->current.createAnswer(new SdpObserver(){
                @Override public void onCreateSuccess(SessionDescription sdp){
                    current.setLocalDescription(observer(()->runOnUiThread(()->{
                        handler.postDelayed(iceTimeout,ICE_TIMEOUT_MS);
                        if(current.iceGatheringState()==PeerConnection.IceGatheringState.COMPLETE)publishAnswer();
                        else show("Generating TV answer; waiting for local network candidates…");
                    })),sdp);
                }
                @Override public void onSetSuccess(){}
                @Override public void onCreateFailure(String error){failure("Unable to create TV connection answer");}
                @Override public void onSetFailure(String error){failure("Unable to set local connection answer");}
            },new MediaConstraints())),remoteOffer);
        }catch(Exception error){stopCasting();show("Screen-sharing setup failed: "+error.getClass().getSimpleName());}
    }
    private SdpObserver observer(Runnable success){return new SdpObserver(){
        @Override public void onCreateSuccess(SessionDescription sdp){}
        @Override public void onSetSuccess(){success.run();}
        @Override public void onCreateFailure(String error){failure("WebRTC negotiation failed");}
        @Override public void onSetFailure(String error){failure("TV offer could not be accepted");}
    };}
    private void failure(String value){runOnUiThread(()->{stopCasting();show(value);});}
    private void publishAnswer(){
        if(!sharing||peer==null||peer.getLocalDescription()==null||peer.iceGatheringState()!=PeerConnection.IceGatheringState.COMPLETE)return;
        try{
            JSONObject json=new JSONObject();json.put("type","answer");json.put("sdp",peer.getLocalDescription().description);
            answer.setText(json.toString());
            handler.removeCallbacks(iceTimeout);
            show("Answer ready. Copy it to the TV and finish viewer connection.");
        }catch(Exception ignored){failure("Could not encode connection answer");}
    }
    private void stopCasting(){
        if(stopping)return;
        stopping=true;sharing=false;
        handler.removeCallbacks(expire);handler.removeCallbacks(iceTimeout);
        if(peer!=null){PeerConnection previous=peer;peer=null;previous.close();previous.dispose();}
        if(capturer!=null){ScreenCapturerAndroid previous=capturer;capturer=null;try{previous.stopCapture();}catch(RuntimeException ignored){}previous.dispose();}
        if(videoTrack!=null){videoTrack.dispose();videoTrack=null;}
        if(source!=null){source.dispose();source=null;}
        if(textureHelper!=null){textureHelper.dispose();textureHelper=null;}
        if(factory!=null){factory.dispose();factory=null;}
        if(egl!=null){egl.release();egl=null;}
        stopService(new Intent(this,ProjectionNoticeService.class));
        if(start!=null){start.setEnabled(true);stop.setEnabled(false);offer.setEnabled(true);}
        if(answer!=null)answer.setText("");
        show("Screen sharing stopped. You must approve Android permission for any new session.");
        remoteOffer=null;stopping=false;
    }
    @Override protected void onDestroy(){
        stopCasting();if(active.get()==this)active.clear();
        super.onDestroy();
    }
}
