using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Windows.Forms;

namespace MooncatDesktop {
  // A native, per-pixel-alpha pet. It never opens a browser or takes keyboard focus.
  internal sealed class RoamingCatForm : Form {
    private readonly Bitmap sprite;
    private readonly Timer ticker;
    private readonly ContextMenuStrip menu;
    private readonly ToolStripMenuItem pauseItem;
    private readonly Action showGarden,hideCat,exitApp;
    private readonly Random random=new Random();
    private readonly System.Diagnostics.Stopwatch watch=System.Diagnostics.Stopwatch.StartNew();
    private double previousTime,x,baseY,speed,nextAction,pauseUntil,hopAt=-10,heartsAt=-10,lastMeow=-10;
    private float scale=1;
    private int direction=1;
    private bool walking=true,manualPause,dragging,moved,disposing;
    private Point dragMouse,dragLocation;
    private const int WsExLayered=0x80000,WsExNoActivate=0x08000000,WsExToolWindow=0x80;

    [StructLayout(LayoutKind.Sequential)] private struct WinPoint { public int X,Y; public WinPoint(int x,int y){X=x;Y=y;} }
    [StructLayout(LayoutKind.Sequential)] private struct WinSize { public int X,Y; public WinSize(int x,int y){X=x;Y=y;} }
    [StructLayout(LayoutKind.Sequential,Pack=1)] private struct Blend { public byte Op,Flags,Alpha,Format; }
    [DllImport("user32.dll",SetLastError=true)] private static extern bool UpdateLayeredWindow(IntPtr window,IntPtr screen,ref WinPoint destination,ref WinSize size,IntPtr source,ref WinPoint sourcePoint,uint key,ref Blend blend,uint flags);
    [DllImport("user32.dll")] private static extern IntPtr GetDC(IntPtr window);
    [DllImport("user32.dll")] private static extern int ReleaseDC(IntPtr window,IntPtr dc);
    [DllImport("gdi32.dll")] private static extern IntPtr CreateCompatibleDC(IntPtr dc);
    [DllImport("gdi32.dll")] private static extern IntPtr SelectObject(IntPtr dc,IntPtr item);
    [DllImport("gdi32.dll")] private static extern bool DeleteObject(IntPtr item);
    [DllImport("gdi32.dll")] private static extern bool DeleteDC(IntPtr dc);
    [DllImport("winmm.dll",CharSet=CharSet.Unicode)] private static extern uint mciSendString(string command,StringBuilder result,int length,IntPtr callback);

    internal RoamingCatForm(Action show,Action hide,Action exit) {
      showGarden=show;hideCat=hide;exitApp=exit;
      string file=Path.Combine(Program.AssetRoot,"assets","cat-walk.png");
      using(var source=new MemoryStream(File.ReadAllBytes(file)))using(var image=Image.FromStream(source))sprite=new Bitmap(image);
      if(sprite.Width%4!=0 || sprite.Height%2!=0)throw new InvalidDataException("The native pet requires a uniform 4 × 2 sprite grid.");
      Text="月白 · Mooncat";FormBorderStyle=FormBorderStyle.None;ShowInTaskbar=false;TopMost=true;StartPosition=FormStartPosition.Manual;
      AutoScaleMode=AutoScaleMode.None;
      using(var g=CreateGraphics())scale=g.DpiX/96f;
      ClientSize=new Size((int)(110*scale),(int)(100*scale));
      var area=Screen.PrimaryScreen.WorkingArea;
      x=area.Right-Width-42*scale;baseY=area.Bottom-Height-4*scale;Location=new Point((int)x,(int)baseY);
      speed=(20+random.NextDouble()*15)*scale;nextAction=6+random.NextDouble()*8;
      menu=new ContextMenuStrip();
      pauseItem=new ToolStripMenuItem("让月白休息一下") { CheckOnClick=true };
      pauseItem.CheckedChanged+=delegate {manualPause=pauseItem.Checked;};
      menu.Items.Add(pauseItem);
      menu.Items.Add("打开桌边小花园",null,delegate {showGarden();});
      menu.Items.Add("把月白收起来",null,delegate {hideCat();});
      menu.Items.Add(new ToolStripSeparator());
      menu.Items.Add("退出 Mooncat",null,delegate {exitApp();});
      ContextMenuStrip=menu;
      ticker=new Timer {Interval=50};ticker.Tick+=delegate {TickPet();};
      Shown+=delegate {DrawPet();ticker.Start();};
      FormClosing+=delegate(object sender,FormClosingEventArgs e) { if(!disposing && e.CloseReason==CloseReason.UserClosing){e.Cancel=true;hideCat();} };
      if(Program.IsRuntimeTest){Location=new Point(-32000,-32000);x=Location.X;baseY=Location.Y;TopMost=false;}
    }

    protected override CreateParams CreateParams {
      get {var result=base.CreateParams;result.ExStyle|=WsExLayered|WsExNoActivate|WsExToolWindow;return result;}
    }
    protected override bool ShowWithoutActivation {get{return true;}}
    protected override void WndProc(ref Message message) {
      if(message.Msg==0x0021){message.Result=new IntPtr(3);return;}
      base.WndProc(ref message);
    }

    internal void SetPetVisible(bool enabled) {
      if(enabled){previousTime=watch.Elapsed.TotalSeconds;Show();ticker.Start();DrawPet();}
      else{ticker.Stop();Hide();}
    }

    private void TickPet() {
      if(disposing || !Visible)return;
      double now=watch.Elapsed.TotalSeconds,dt=Math.Min(.15,Math.Max(0,now-previousTime));previousTime=now;
      bool active=!manualPause && !dragging && now>=pauseUntil;
      var area=Screen.FromControl(this).WorkingArea;
      if(active && !Program.IsRuntimeTest) {
        if(now>=nextAction) {
          walking=!walking;
          nextAction=now+(walking?6+random.NextDouble()*9:3+random.NextDouble()*4);
          if(walking && random.NextDouble()<.4)hopAt=now;
        }
        if(walking) {
          x+=direction*speed*dt;
          if(x>=area.Right-Width-4*scale){x=area.Right-Width-4*scale;direction=-1;}
          if(x<=area.Left+4*scale){x=area.Left+4*scale;direction=1;}
          double taskbarLine=area.Bottom-Height-4*scale;
          baseY+=Math.Sign(taskbarLine-baseY)*Math.Min(Math.Abs(taskbarLine-baseY),80*scale*dt);
        }
      }
      DrawPet();
    }

    private void DrawPet(int? forcedFrame=null) {
      if(disposing || !IsHandleCreated || Width<=0 || Height<=0)return;
      double now=watch.Elapsed.TotalSeconds;
      bool active=walking && !manualPause && !dragging && now>=pauseUntil;
      int frame=forcedFrame.HasValue?forcedFrame.Value:(active?(int)(now*6)%8:0);
      double hop=now-hopAt;
      double lift=hop>=0 && hop<.75?Math.Sin(hop/.75*Math.PI)*10*scale:0;
      Location=new Point((int)Math.Round(x),(int)Math.Round(baseY-lift));
      using(var bitmap=new Bitmap(Width,Height,PixelFormat.Format32bppPArgb)) {
        using(var g=Graphics.FromImage(bitmap)) {
          g.Clear(Color.Transparent);g.SmoothingMode=SmoothingMode.AntiAlias;g.InterpolationMode=InterpolationMode.HighQualityBicubic;g.PixelOffsetMode=PixelOffsetMode.HighQuality;
          float breath=active?1f:(float)(1+Math.Sin(now*1.35)*.018);
          float stretch=!active?(float)(1+Math.Pow(Math.Max(0,Math.Sin(now*.25)),12)*.045):1;
          float drawWidth=Width*.9f/breath,drawHeight=Height*.88f*breath*stretch;
          float drawX=(Width-drawWidth)/2,drawY=Height-drawHeight-4*scale;
          g.TranslateTransform(Width/2f,0);
          if(direction<0)g.ScaleTransform(-1,1);
          Rectangle source=new Rectangle((frame%4)*(sprite.Width/4),(frame/4)*(sprite.Height/2),sprite.Width/4,sprite.Height/2);
          g.DrawImage(sprite,new RectangleF(drawX-Width/2f,drawY,drawWidth,drawHeight),source,GraphicsUnit.Pixel);
          g.ResetTransform();
          double heartAge=now-heartsAt;
          if(heartAge>=0 && heartAge<1.7) {
            int alpha=(int)(255*(1-heartAge/1.7));
            using(var brush=new SolidBrush(Color.FromArgb(alpha,225,152,168)))using(var font=new Font("Segoe UI Symbol",12*scale,FontStyle.Regular,GraphicsUnit.Pixel)) {
              g.DrawString("♥",font,brush,new PointF(Width*.6f,(float)(Height*.18-heartAge*15*scale)));
              g.DrawString("♥",font,brush,new PointF(Width*.28f,(float)(Height*.3-heartAge*10*scale)));
            }
          }
        }
        IntPtr screen=GetDC(IntPtr.Zero),memory=CreateCompatibleDC(screen),handle=bitmap.GetHbitmap(Color.FromArgb(0)),old=SelectObject(memory,handle);
        try {
          WinPoint destination=new WinPoint(Left,Top),origin=new WinPoint(0,0);WinSize size=new WinSize(Width,Height);Blend blend=new Blend {Op=0,Flags=0,Alpha=255,Format=1};
          if(!UpdateLayeredWindow(Handle,screen,ref destination,ref size,memory,ref origin,0,ref blend,2))throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error(),"Native cat alpha rendering failed.");
        } finally {SelectObject(memory,old);DeleteObject(handle);DeleteDC(memory);ReleaseDC(IntPtr.Zero,screen);}
      }
    }

    internal string VerifyNativeFrames() {
      if(!Program.IsRuntimeTest)throw new InvalidOperationException("Native pet tests require the isolated smoke-test mode.");
      for(int frame=0;frame<8;frame++)DrawPet(frame);
      return "PASS native per-pixel-alpha layered cat; 8 frames rendered; "+ClientSize.Width+" × "+ClientSize.Height+" physical pixels; WS_EX_NOACTIVATE; no taskbar window";
    }

    protected override void OnMouseDown(MouseEventArgs e) {
      base.OnMouseDown(e);
      if(e.Button==MouseButtons.Left){dragging=true;moved=false;dragMouse=Cursor.Position;dragLocation=Location;Capture=true;pauseUntil=watch.Elapsed.TotalSeconds+12;}
    }
    protected override void OnMouseMove(MouseEventArgs e) {
      base.OnMouseMove(e);
      if(!dragging)return;
      var delta=new Point(Cursor.Position.X-dragMouse.X,Cursor.Position.Y-dragMouse.Y);
      if(Math.Abs(delta.X)+Math.Abs(delta.Y)>4*scale)moved=true;
      var area=Screen.FromPoint(Cursor.Position).WorkingArea;
      x=Math.Max(area.Left,Math.Min(dragLocation.X+delta.X,area.Right-Width));
      baseY=Math.Max(area.Top,Math.Min(dragLocation.Y+delta.Y,area.Bottom-Height));
      DrawPet();
    }
    protected override void OnMouseUp(MouseEventArgs e) {
      base.OnMouseUp(e);
      if(e.Button==MouseButtons.Left && dragging){dragging=false;Capture=false;pauseUntil=watch.Elapsed.TotalSeconds+12;if(!moved){heartsAt=watch.Elapsed.TotalSeconds;Meow();}DrawPet();}
    }
    protected override void OnMouseDoubleClick(MouseEventArgs e) {base.OnMouseDoubleClick(e);if(e.Button==MouseButtons.Left)showGarden();}
    private void Meow() {
      double now=watch.Elapsed.TotalSeconds;
      if(Program.IsRuntimeTest || now-lastMeow<.8)return;lastMeow=now;
      string file=Path.Combine(Program.AssetRoot,"assets","meow.mp3");
      if(!File.Exists(file))return;
      mciSendString("close MooncatRoamer",null,0,IntPtr.Zero);
      if(mciSendString("open \""+file+"\" type mpegvideo alias MooncatRoamer",null,0,IntPtr.Zero)==0){mciSendString("setaudio MooncatRoamer volume to 380",null,0,IntPtr.Zero);mciSendString("play MooncatRoamer from 0",null,0,IntPtr.Zero);}
    }
    protected override void Dispose(bool disposingResources) {
      disposing=true;
      if(disposingResources){ticker.Stop();ticker.Dispose();menu.Dispose();sprite.Dispose();mciSendString("close MooncatRoamer",null,0,IntPtr.Zero);}
      base.Dispose(disposingResources);
    }
  }
}
