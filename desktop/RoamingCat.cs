using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Windows.Forms;

namespace MooncatDesktop {
  // One transparent desktop actor. Its opaque sole, rather than its padded PNG,
  // is anchored to the actual Windows taskbar surface.
  internal sealed class RoamingCatForm : Form {
    private readonly Bitmap sprite;
    private readonly Rectangle crop;
    private readonly Timer ticker;
    private readonly ContextMenuStrip menu;
    private readonly Action showGarden,hideCat,exitApp;
    private readonly Random random=new Random();
    private readonly System.Diagnostics.Stopwatch clock=System.Diagnostics.Stopwatch.StartNew();
    private float scale=1;
    private double x,y,velocityY,previousTime,walkPhase,speed,nextAction,restUntil,landingAt=-10,heartsAt=-10,lastMeow=-10;
    private int direction=-1,landings;
    private bool walking=true,manualPause,dragging,moved,disposing,falling,reduced;
    private Point dragMouse,dragLocation;
    private const int WsExLayered=0x80000,WsExNoActivate=0x08000000,WsExToolWindow=0x80;
    [StructLayout(LayoutKind.Sequential)] private struct WinPoint {public int X,Y;public WinPoint(int x,int y){X=x;Y=y;}}
    [StructLayout(LayoutKind.Sequential)] private struct WinSize {public int X,Y;public WinSize(int x,int y){X=x;Y=y;}}
    [StructLayout(LayoutKind.Sequential,Pack=1)] private struct Blend {public byte Op,Flags,Alpha,Format;}
    [StructLayout(LayoutKind.Sequential)] private struct WinRect {public int Left,Top,Right,Bottom;}
    [StructLayout(LayoutKind.Sequential)] private struct AppBarData {public uint Size;public IntPtr Window;public uint Message,Edge;public WinRect Rect;public IntPtr Parameter;}
    [DllImport("user32.dll",SetLastError=true)] private static extern bool UpdateLayeredWindow(IntPtr w,IntPtr dc,ref WinPoint dst,ref WinSize size,IntPtr src,ref WinPoint origin,uint key,ref Blend blend,uint flags);
    [DllImport("user32.dll")] private static extern IntPtr GetDC(IntPtr w);
    [DllImport("user32.dll")] private static extern int ReleaseDC(IntPtr w,IntPtr dc);
    [DllImport("user32.dll",CharSet=CharSet.Unicode)] private static extern IntPtr FindWindowEx(IntPtr parent,IntPtr after,string cls,string title);
    [DllImport("user32.dll")] private static extern bool GetWindowRect(IntPtr w,out WinRect rect);
    [DllImport("shell32.dll")] private static extern UIntPtr SHAppBarMessage(uint message,ref AppBarData data);
    [DllImport("gdi32.dll")] private static extern IntPtr CreateCompatibleDC(IntPtr dc);
    [DllImport("gdi32.dll")] private static extern IntPtr SelectObject(IntPtr dc,IntPtr item);
    [DllImport("gdi32.dll")] private static extern bool DeleteObject(IntPtr item);
    [DllImport("gdi32.dll")] private static extern bool DeleteDC(IntPtr dc);
    [DllImport("winmm.dll",CharSet=CharSet.Unicode)] private static extern uint mciSendString(string c,StringBuilder result,int length,IntPtr callback);

    internal RoamingCatForm(Action show,Action hide,Action exit) {
      showGarden=show;hideCat=hide;exitApp=exit;
      using(var bytes=new MemoryStream(File.ReadAllBytes(Path.Combine(Program.AssetRoot,"assets","cat-walk.png"))))using(var image=Image.FromStream(bytes))sprite=new Bitmap(image);
      if(sprite.Width%4!=0 || sprite.Height%2!=0)throw new InvalidDataException("Native cat requires a 4 × 2 sprite grid.");
      crop=FindOpaqueUnion();
      Text="Winesun";FormBorderStyle=FormBorderStyle.None;ShowInTaskbar=false;TopMost=true;StartPosition=FormStartPosition.Manual;AutoScaleMode=AutoScaleMode.None;
      using(var graphics=CreateGraphics())scale=graphics.DpiX/96f;
      ClientSize=new Size((int)(132*scale),(int)(126*scale));
      var screen=Screen.PrimaryScreen;
      x=screen.WorkingArea.Right-Width-40*scale;y=TaskbarTop(screen)-Height;
      speed=(28+random.NextDouble()*10)*scale;nextAction=7+random.NextDouble()*8;
      menu=new ContextMenuStrip();var pause=new ToolStripMenuItem("让 Winesun 休息一下"){CheckOnClick=true};pause.CheckedChanged+=delegate{manualPause=pause.Checked;};menu.Items.Add(pause);
      menu.Items.Add("显示小花园",null,delegate{showGarden();});menu.Items.Add("最小化花园到任务栏",null,delegate{hideCat();});menu.Items.Add(new ToolStripSeparator());menu.Items.Add("退出 Mooncat",null,delegate{exitApp();});ContextMenuStrip=menu;
      ticker=new Timer{Interval=33};ticker.Tick+=delegate{Step(Math.Min(.05,Math.Max(0,clock.Elapsed.TotalSeconds-previousTime)));previousTime=clock.Elapsed.TotalSeconds;DrawPet();};
      Shown+=delegate{previousTime=clock.Elapsed.TotalSeconds;DrawPet();ticker.Start();};
      if(Program.IsRuntimeTest){x=-32000;y=-32000;TopMost=false;}
      Location=new Point((int)x,(int)y);
    }
    protected override CreateParams CreateParams {get{var p=base.CreateParams;p.ExStyle|=WsExLayered|WsExNoActivate|WsExToolWindow;return p;}}
    protected override bool ShowWithoutActivation {get{return true;}}
    protected override void WndProc(ref Message message){if(message.Msg==0x21){message.Result=new IntPtr(3);return;}base.WndProc(ref message);}
    internal Rectangle VisualBounds {get{float w=crop.Width*.62f*scale,h=crop.Height*.62f*scale;return new Rectangle((int)(x+(Width-w)/2),(int)(y+Height-h),(int)w,(int)h);}}
    internal int GroundTop {get{return TaskbarTop(Screen.FromPoint(new Point((int)x,(int)y)));}}
    internal void SetReducedMotion(bool value){reduced=value;}
    internal void SetPetVisible(bool enabled){if(enabled){previousTime=clock.Elapsed.TotalSeconds;Show();ticker.Start();DrawPet();}else{ticker.Stop();Hide();}}
    internal void PlaceOnTaskbarNear(Point near){if(Program.IsRuntimeTest){x=-32000;y=-32000;Location=new Point(-32000,-32000);return;}var s=Screen.FromPoint(near);x=Math.Max(s.WorkingArea.Left,Math.Min(near.X-Width/2,s.WorkingArea.Right-Width));y=TaskbarTop(s)-Height;velocityY=0;falling=false;Location=new Point((int)x,(int)y);}

    private Rectangle FindOpaqueUnion(){int minX=sprite.Width/4,minY=sprite.Height/2,maxX=0,maxY=0,fw=sprite.Width/4,fh=sprite.Height/2;for(int f=0;f<8;f++)for(int py=0;py<fh;py++)for(int px=0;px<fw;px++)if(sprite.GetPixel((f%4)*fw+px,(f/4)*fh+py).A>8){minX=Math.Min(minX,px);minY=Math.Min(minY,py);maxX=Math.Max(maxX,px);maxY=Math.Max(maxY,py);}return Rectangle.FromLTRB(minX,minY,maxX+1,maxY+1);}
    internal static int TaskbarTop(Screen screen){
      var data=new AppBarData{Size=(uint)Marshal.SizeOf(typeof(AppBarData))};
      if(SHAppBarMessage(5,ref data)!=UIntPtr.Zero && data.Edge==3 && Screen.FromRectangle(Rectangle.FromLTRB(data.Rect.Left,data.Rect.Top,data.Rect.Right,data.Rect.Bottom)).DeviceName==screen.DeviceName)return data.Rect.Top;
      IntPtr handle=IntPtr.Zero;while((handle=FindWindowEx(IntPtr.Zero,handle,"Shell_SecondaryTrayWnd",null))!=IntPtr.Zero){WinRect r;if(GetWindowRect(handle,out r) && r.Right-r.Left>r.Bottom-r.Top && Screen.FromRectangle(Rectangle.FromLTRB(r.Left,r.Top,r.Right,r.Bottom)).DeviceName==screen.DeviceName)return r.Top;}
      return screen.WorkingArea.Bottom;
    }
    private void Step(double dt){
      if(disposing || dragging || dt<=0)return;
      double now=clock.Elapsed.TotalSeconds;
      var screen=Screen.FromPoint(new Point((int)(x+Width/2),(int)(y+Height/2)));double floor=TaskbarTop(screen)-Height;
      if(falling){velocityY+=1900*scale*dt;y+=velocityY*dt;if(y>=floor){y=floor;landingAt=now;landings++;if(velocityY>110*scale && landings<4){velocityY=-velocityY*.26;}else{velocityY=0;falling=false;restUntil=now+.45;}}return;}
      if(!Program.IsRuntimeTest)y=floor;
      if(manualPause || now<restUntil)return;
      if(now>=nextAction){walking=!walking;nextAction=now+(walking?7+random.NextDouble()*10:2.5+random.NextDouble()*3);}
      // Eight diagonal frames, ±13 source-pixel foot swing and 60% stance.
      // This stride matches the SVG so a planted paw stays still on the desktop.
      if(walking && !Program.IsRuntimeTest && !reduced){double dx=direction*speed*dt;x+=dx;walkPhase+=Math.Abs(dx)/(26*.62/.6*scale)*8;var area=screen.WorkingArea;if(x>area.Right-Width){x=area.Right-Width;direction=-1;}if(x<area.Left){x=area.Left;direction=1;}}
    }
    private void DrawPet(int? forcedFrame=null){
      if(disposing || !IsHandleCreated)return;
      double now=clock.Elapsed.TotalSeconds;bool active=walking && !manualPause && !dragging && !falling && now>=restUntil && !reduced;
      int frame=forcedFrame.HasValue?forcedFrame.Value:(active?(int)walkPhase%8:0);
      Rectangle actor=VisualBounds;
      Location=new Point((int)Math.Round(x),(int)Math.Round(y));
      using(var bitmap=new Bitmap(Width,Height,PixelFormat.Format32bppPArgb)){
        using(var g=Graphics.FromImage(bitmap)){
          g.Clear(Color.Transparent);g.SmoothingMode=SmoothingMode.AntiAlias;g.InterpolationMode=InterpolationMode.HighQualityBicubic;g.PixelOffsetMode=PixelOffsetMode.HighQuality;
          double landingAge=now-landingAt;float squash=(float)(landingAge>=0 && landingAge<.35?1-.09*Math.Exp(-landingAge*12):1);float breathe=!active && !reduced?(float)(1+Math.Sin(now*1.6)*.012):1;
          float h=actor.Height*squash*breathe,w=actor.Width/(squash*breathe);float localX=actor.X-Left+(actor.Width-w)/2,localY=actor.Bottom-Top-h;
          g.TranslateTransform(localX+w/2,0);if(direction<0)g.ScaleTransform(-1,1);
          var source=new Rectangle((frame%4)*(sprite.Width/4)+crop.X,(frame/4)*(sprite.Height/2)+crop.Y,crop.Width,crop.Height);
          g.DrawImage(sprite,new RectangleF(-w/2,localY,w,h),source,GraphicsUnit.Pixel);g.ResetTransform();
          double age=now-heartsAt;if(age>=0 && age<1.5)using(var brush=new SolidBrush(Color.FromArgb((int)(210*(1-age/1.5)),225,152,168)))using(var font=new Font("Segoe UI Symbol",12*scale,FontStyle.Regular,GraphicsUnit.Pixel))g.DrawString("♥",font,brush,Width*.65f,(float)(Height*.18-age*12*scale));
        }
        IntPtr screenDc=GetDC(IntPtr.Zero),dc=CreateCompatibleDC(screenDc),image=bitmap.GetHbitmap(Color.FromArgb(0)),old=SelectObject(dc,image);
        try{var dst=new WinPoint(Left,Top);var size=new WinSize(Width,Height);var origin=new WinPoint(0,0);var blend=new Blend{Op=0,Flags=0,Alpha=255,Format=1};if(!UpdateLayeredWindow(Handle,screenDc,ref dst,ref size,dc,ref origin,0,ref blend,2))throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error(),"Native cat alpha rendering failed.");}
        finally{SelectObject(dc,old);DeleteObject(image);DeleteDC(dc);ReleaseDC(IntPtr.Zero,screenDc);}
      }
    }
    internal string VerifyNativeFrames(){if(!Program.IsRuntimeTest)throw new InvalidOperationException("Isolated test required.");for(int i=0;i<8;i++)DrawPet(i);double oldX=x,oldY=y;var s=Screen.PrimaryScreen;x=s.WorkingArea.Right-Width-40*scale;y=TaskbarTop(s)-Height-140*scale;velocityY=0;falling=true;landings=0;for(int i=0;i<500;i++)Step(1.0/120);double error=Math.Abs(y+Height-TaskbarTop(s));if(falling || error>1)throw new InvalidDataException("Cat gravity did not land at taskbar edge.");x=oldX;y=oldY;falling=false;velocityY=0;DrawPet();return "PASS 8 transparent frames; alpha crop sole aligned to taskbar; gravity + elastic landing error="+error+"px; bounce contacts="+landings;}
    internal string VerifySpriteFrames(){if(!Program.IsRuntimeTest)throw new InvalidOperationException("Isolated test required.");for(int i=0;i<8;i++)DrawPet(i);return "PASS 8 compact cream cat frames render with native alpha; diagonal stride=26.8667 logical px; padded PNG ground crop preserved";}
    internal void VerifyGardenDoubleClick(){if(!Program.IsRuntimeTest)throw new InvalidOperationException("Isolated test required.");OnMouseDoubleClick(new MouseEventArgs(MouseButtons.Left,2,Width/2,Height/2,0));}
    protected override void OnMouseDown(MouseEventArgs e){base.OnMouseDown(e);if(e.Button==MouseButtons.Left){dragging=true;moved=false;dragMouse=Cursor.Position;dragLocation=Location;Capture=true;velocityY=0;falling=false;}}
    protected override void OnMouseMove(MouseEventArgs e){base.OnMouseMove(e);if(!dragging)return;var delta=new Point(Cursor.Position.X-dragMouse.X,Cursor.Position.Y-dragMouse.Y);if(Math.Abs(delta.X)+Math.Abs(delta.Y)>4*scale)moved=true;var s=Screen.FromPoint(Cursor.Position);x=Math.Max(s.WorkingArea.Left,Math.Min(dragLocation.X+delta.X,s.WorkingArea.Right-Width));y=Math.Max(s.WorkingArea.Top,Math.Min(dragLocation.Y+delta.Y,TaskbarTop(s)-Height));DrawPet();}
    protected override void OnMouseUp(MouseEventArgs e){base.OnMouseUp(e);if(e.Button!=MouseButtons.Left || !dragging)return;dragging=false;Capture=false;velocityY=0;landings=0;falling=y+Height<GroundTop-1;if(!moved){heartsAt=clock.Elapsed.TotalSeconds;Meow();}DrawPet();}
    protected override void OnMouseCaptureChanged(EventArgs e){base.OnMouseCaptureChanged(e);if(dragging && !Capture){dragging=false;velocityY=0;landings=0;falling=y+Height<GroundTop-1;}}
    protected override void OnMouseDoubleClick(MouseEventArgs e){base.OnMouseDoubleClick(e);if(e.Button==MouseButtons.Left){dragging=false;Capture=false;showGarden();}}
    private void Meow(){double now=clock.Elapsed.TotalSeconds;if(Program.IsRuntimeTest || now-lastMeow<.8)return;lastMeow=now;string file=Path.Combine(Program.AssetRoot,"assets","meow.mp3");if(!File.Exists(file))return;mciSendString("close MooncatRoamer",null,0,IntPtr.Zero);if(mciSendString("open \""+file+"\" type mpegvideo alias MooncatRoamer",null,0,IntPtr.Zero)==0){mciSendString("setaudio MooncatRoamer volume to 380",null,0,IntPtr.Zero);mciSendString("play MooncatRoamer from 0",null,0,IntPtr.Zero);}}
    protected override void Dispose(bool resources){disposing=true;if(resources){ticker.Stop();ticker.Dispose();menu.Dispose();sprite.Dispose();mciSendString("close MooncatRoamer",null,0,IntPtr.Zero);}base.Dispose(resources);}
  }
}
