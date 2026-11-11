package app.newview.phonecaster;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;
import android.os.ResultReceiver;

/** Visible notification and foreground-service requirement for user-authorized MediaProjection. */
public final class ProjectionNoticeService extends Service {
    public static final String ACTION_START="app.newview.phonecaster.START";
    public static final String ACTION_STOP="app.newview.phonecaster.STOP";
    public static final String EXTRA_RECEIVER="receiver";
    private static final String CHANNEL="newview-screen-capture";
    private static final int ID=4101;
    @Override public IBinder onBind(Intent intent){return null;}
    @Override public int onStartCommand(Intent intent,int flags,int startId){
        if(intent==null||ACTION_STOP.equals(intent.getAction())){
            CasterActivity.stopActiveCapture();
            stopForeground(STOP_FOREGROUND_REMOVE);stopSelf();return START_NOT_STICKY;
        }
        if(!ACTION_START.equals(intent.getAction())){stopSelf();return START_NOT_STICKY;}
        ResultReceiver receiver;
        if(Build.VERSION.SDK_INT>=33)receiver=intent.getParcelableExtra(EXTRA_RECEIVER,ResultReceiver.class);
        else receiver=intent.getParcelableExtra(EXTRA_RECEIVER);
        try {
            NotificationManager manager=(NotificationManager)getSystemService(Context.NOTIFICATION_SERVICE);
            manager.createNotificationChannel(new NotificationChannel(CHANNEL,"Active NewView screen casting",NotificationManager.IMPORTANCE_LOW));
            Intent stop=new Intent(this,ProjectionNoticeService.class).setAction(ACTION_STOP);
            PendingIntent stopAction=PendingIntent.getService(this,0,stop,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
            PendingIntent open=PendingIntent.getActivity(this,0,new Intent(this,CasterActivity.class),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
            Notification notice=new Notification.Builder(this,CHANNEL)
                .setSmallIcon(android.R.drawable.ic_menu_share)
                .setContentTitle("NewView screen sharing is active")
                .setContentText("Your phone screen can be shared. Tap to return to NewView.")
                .setOngoing(true).setContentIntent(open)
                .addAction(new Notification.Action.Builder(null,"Stop sharing",stopAction).build())
                .build();
            if(Build.VERSION.SDK_INT>=29)startForeground(ID,notice,ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION);
            else startForeground(ID,notice);
            if(receiver!=null)receiver.send(1,null);
        } catch (RuntimeException error){
            if(receiver!=null)receiver.send(-1,null);
            stopSelf();return START_NOT_STICKY;
        }
        return START_NOT_STICKY;
    }
}
