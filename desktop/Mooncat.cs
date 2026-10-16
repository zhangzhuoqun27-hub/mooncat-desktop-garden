using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

[assembly: AssemblyTitle("Winesun 的小花园")]
[assembly: AssemblyDescription("A quiet original desktop garden under the stars.")]
[assembly: AssemblyCompany("Mooncat")]
[assembly: AssemblyProduct("Mooncat Desktop")]
[assembly: AssemblyVersion("0.2.2.0")]
[assembly: AssemblyFileVersion("0.2.2.0")]

namespace MooncatDesktop {
  internal static class Program {
    internal static string Profile, AssetRoot, SdkRoot, QaScript;
    internal static string InitialTestMode="expanded";
    internal static string CapturePreviewPath;
    internal static string CapturePostQaPath;
    internal static bool CaptureAfterQa;
    internal static bool IsRuntimeTest;
    internal static bool TestTransitions;
    internal static bool TestRoamer;
    internal static bool TestSpriteFrames;
    internal static bool TestCatPause;
    internal static int ResultCode;
    internal static System.Threading.EventWaitHandle ShowRequest;
    private static System.Threading.Mutex instanceMutex;
    internal static readonly Assembly ThisAssembly = Assembly.GetExecutingAssembly();
    private const uint AttachParentProcess = 0xFFFFFFFF;
    [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] private static extern bool SetDllDirectory(string path);
    [DllImport("kernel32.dll", SetLastError=true)] private static extern bool AttachConsole(uint id);

    [STAThread]
    private static int Main(string[] args) {
      bool selfTest = Array.IndexOf(args, "--self-test") >= 0;
      IsRuntimeTest = Array.IndexOf(args, "--smoke-test") >= 0;
      TestTransitions = IsRuntimeTest && Array.IndexOf(args,"--transition-test") >= 0;
      TestRoamer = IsRuntimeTest && Array.IndexOf(args,"--roamer-test") >= 0;
      TestSpriteFrames = IsRuntimeTest && Array.IndexOf(args,"--sprite-test") >= 0;
      TestCatPause = IsRuntimeTest && Array.IndexOf(args,"--cat-pause-test") >= 0;
      try {
        Profile = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Mooncat", "MoonGarden");
        for (int i=0; i<args.Length; ++i) {
          if (args[i] == "--test-profile") {
            if (i+1 >= args.Length || !Path.IsPathRooted(args[i+1])) throw new ArgumentException("--test-profile requires an absolute directory.");
            Profile = Path.GetFullPath(args[++i]);
          }
          if (args[i] == "--qa-script") {
            if (!IsRuntimeTest || i+1 >= args.Length || !Path.IsPathRooted(args[i+1])) throw new ArgumentException("--qa-script requires --smoke-test and an absolute script path.");
            QaScript = File.ReadAllText(args[++i],Encoding.UTF8);
          }
          if(args[i]=="--test-mode") {
            if(!IsRuntimeTest || i+1>=args.Length)throw new ArgumentException("--test-mode requires --smoke-test and a mode.");
            InitialTestMode=args[++i];
            if(InitialTestMode!="compact" && InitialTestMode!="peek" && InitialTestMode!="expanded")throw new ArgumentException("Unknown test mode.");
          }
          if(args[i]=="--capture-preview") {
            if(!IsRuntimeTest || i+1>=args.Length || !Path.IsPathRooted(args[i+1]))throw new ArgumentException("--capture-preview requires --smoke-test and an absolute output path.");
            CapturePreviewPath=Path.GetFullPath(args[++i]);
          }
          if(args[i]=="--capture-after-qa") {
            if(!IsRuntimeTest)throw new ArgumentException("--capture-after-qa requires --smoke-test.");
            CaptureAfterQa=true;
          }
          if(args[i]=="--capture-post-qa") {
            if(!IsRuntimeTest || i+1>=args.Length || !Path.IsPathRooted(args[i+1]))throw new ArgumentException("--capture-post-qa requires --smoke-test and an absolute output path.");
            CapturePostQaPath=Path.GetFullPath(args[++i]);
          }
        }
        Directory.CreateDirectory(Profile);
        if (!selfTest && !IsRuntimeTest) {
          string instanceName="Local\\Mooncat.MoonGarden."+Sha256(Encoding.UTF8.GetBytes(Profile.ToLowerInvariant())).Substring(0,16);
          bool created;
          instanceMutex=new System.Threading.Mutex(true,instanceName,out created);
          ShowRequest=new System.Threading.EventWaitHandle(false,System.Threading.EventResetMode.AutoReset,instanceName+".show");
          if(!created) { ShowRequest.Set(); ShowRequest.Dispose(); instanceMutex.Dispose(); return 0; }
        }
        string hash = ReadResourceText("Mooncat.assets.sha256").Trim();
        if (hash.Length != 64) throw new InvalidDataException("Invalid embedded archive digest.");
        AssetRoot = Path.Combine(Profile, "assets", hash.Substring(0,16));
        SdkRoot = Path.Combine(Profile, "sdk", "1.0.4258.31-x64");
        PrepareSdk();
        if (!SetDllDirectory(SdkRoot)) throw new InvalidOperationException("Unable to initialize the private application loader directory.");
        AppDomain.CurrentDomain.AssemblyResolve += ResolveSdk;
        PrepareAssets(hash, selfTest);
        if (selfTest) return Diagnostics.Run(hash);
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        Application.ThreadException += delegate(object sender, System.Threading.ThreadExceptionEventArgs e) { ReportError(e.Exception); };
        int result=DesktopApplication.Run();
        if(ShowRequest!=null)ShowRequest.Dispose();
        if(instanceMutex!=null){instanceMutex.ReleaseMutex();instanceMutex.Dispose();}
        return result;
      } catch (Exception ex) {
        if (selfTest) {
          try { File.WriteAllText(Path.Combine(Profile, "self-test.log"), "FAIL\r\n" + ex, Encoding.UTF8); } catch {}
          AttachConsole(AttachParentProcess); Console.Error.WriteLine(ex);
        } else ReportError(ex);
        return 1;
      }
    }

    private static void PrepareSdk() {
      Directory.CreateDirectory(SdkRoot);
      foreach (string name in new [] { "Microsoft.Web.WebView2.Core.dll", "Microsoft.Web.WebView2.WinForms.dll", "WebView2Loader.dll", "LICENSE.txt", "NOTICE.txt" }) {
        byte[] bytes = ReadResource("Mooncat.sdk." + name);
        string target = Path.Combine(SdkRoot, name);
        if (!File.Exists(target) || !BytesEqual(bytes, File.ReadAllBytes(target))) File.WriteAllBytes(target, bytes);
      }
    }

    private static Assembly ResolveSdk(object sender, ResolveEventArgs args) {
      string name = new AssemblyName(args.Name).Name;
      if (name != "Microsoft.Web.WebView2.Core" && name != "Microsoft.Web.WebView2.WinForms") return null;
      return Assembly.LoadFrom(Path.Combine(SdkRoot, name + ".dll"));
    }

    private static void PrepareAssets(string expectedHash, bool force) {
      byte[] archive = ReadResource("Mooncat.assets.zip");
      string actualHash = Sha256(archive);
      if (!String.Equals(actualHash, expectedHash, StringComparison.OrdinalIgnoreCase)) throw new InvalidDataException("The embedded garden package failed its SHA256 check.");
      string marker = Path.Combine(AssetRoot, "asset-package.sha256");
      if (!force && File.Exists(marker) && File.Exists(Path.Combine(AssetRoot,"index.html")) && File.ReadAllText(marker).Trim() == expectedHash) return;
      Directory.CreateDirectory(AssetRoot);
      string canonicalRoot = Path.GetFullPath(AssetRoot).TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
      var names = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
      long total = 0;
      using (var stream = new MemoryStream(archive, false)) using (var zip = new ZipArchive(stream, ZipArchiveMode.Read)) {
        if (zip.Entries.Count > 4096) throw new InvalidDataException("Asset entry count exceeded.");
        foreach (var entry in zip.Entries) {
          string name = entry.FullName.Replace('/', Path.DirectorySeparatorChar);
          if (String.IsNullOrWhiteSpace(name) || Path.IsPathRooted(name) || name.IndexOf(':') >= 0) throw new InvalidDataException("Invalid asset path.");
          string target = Path.GetFullPath(Path.Combine(AssetRoot, name));
          if (!target.StartsWith(canonicalRoot, StringComparison.OrdinalIgnoreCase)) throw new InvalidDataException("An asset path escaped its private directory.");
          if (entry.Name.Length == 0) { Directory.CreateDirectory(target); continue; }
          if (!names.Add(target)) throw new InvalidDataException("Duplicate asset path.");
          total += entry.Length;
          if (entry.Length > 128L*1024*1024 || total > 512L*1024*1024) throw new InvalidDataException("Asset package size exceeded.");
          Directory.CreateDirectory(Path.GetDirectoryName(target));
          using (Stream input = entry.Open()) using (var output = new FileStream(target, FileMode.Create, FileAccess.Write, FileShare.None)) input.CopyTo(output);
          if (new FileInfo(target).Length != entry.Length) throw new InvalidDataException("Incomplete asset extraction.");
        }
      }
      if (!File.Exists(Path.Combine(AssetRoot,"index.html"))) throw new InvalidDataException("Garden entry point missing.");
      File.WriteAllText(marker, expectedHash, Encoding.ASCII);
    }

    internal static byte[] ReadResource(string name) {
      using (Stream stream = ThisAssembly.GetManifestResourceStream(name)) {
        if (stream == null) throw new FileNotFoundException("Embedded resource missing: " + name);
        using (var memory = new MemoryStream()) { stream.CopyTo(memory); return memory.ToArray(); }
      }
    }
    private static string ReadResourceText(string name) { return Encoding.UTF8.GetString(ReadResource(name)); }
    internal static string Sha256(byte[] bytes) { using (var sha = SHA256.Create()) return BitConverter.ToString(sha.ComputeHash(bytes)).Replace("-", "").ToLowerInvariant(); }
    private static bool BytesEqual(byte[] a, byte[] b) { if (a.Length != b.Length) return false; for (int i=0;i<a.Length;++i) if(a[i]!=b[i])return false; return true; }
    internal static void ReportError(Exception ex) {
      try { File.WriteAllText(Path.Combine(Profile,"last-error.log"), DateTime.UtcNow.ToString("o") + "\r\n" + ex, Encoding.UTF8); } catch {}
      if (IsRuntimeTest) { ResultCode=1; return; }
      MessageBox.Show("花园暂时没能打开。\n\n" + ex.Message + "\n\n错误记录：" + Path.Combine(Profile ?? "", "last-error.log"), "Winesun 的小花园", MessageBoxButtons.OK, MessageBoxIcon.Information);
    }
  }

  internal static class Diagnostics {
    internal static int Run(string archiveHash) {
      string runtime = CoreWebView2Environment.GetAvailableBrowserVersionString();
      string index = File.ReadAllText(Path.Combine(Program.AssetRoot,"index.html"), Encoding.UTF8);
      string widget = File.ReadAllText(Path.Combine(Program.AssetRoot,"widget.html"),Encoding.UTF8);
      string petFile=Path.Combine(Program.AssetRoot,"assets","cat-walk.png");
      int petWidth,petHeight,petCornerAlpha;
      using(var pet=Image.FromFile(petFile)) {
        petWidth=pet.Width;petHeight=pet.Height;
        if(petWidth%4!=0 || petHeight%2!=0 || petWidth/4<32 || petHeight/2<32)throw new InvalidDataException("Native cat sprite grid validation failed.");
        using(var bitmap=new Bitmap(pet))petCornerAlpha=bitmap.GetPixel(0,0).A;
        if(petCornerAlpha!=0)throw new InvalidDataException("The native cat sheet must have a transparent background.");
      }
      ValidateDiagonalGait();
      foreach (string file in new [] { "index.html", "game.js", "audio.js", "app.js", "starfield.js", "widget.html", "widget.css", "widget.js" }) {
        string path = Path.Combine(Program.AssetRoot,file);
        if (!File.Exists(path) || new FileInfo(path).Length == 0) throw new InvalidDataException("Required asset missing: " + file);
        if(file.EndsWith(".js")){string page=(file=="game.js" || file=="widget.js")?widget:index;if(page.IndexOf(file,StringComparison.Ordinal)<0)throw new InvalidDataException("Script not linked to its page: "+file);}
      }
      if(widget.IndexOf("widget.js",StringComparison.Ordinal)<0 || widget.IndexOf("widget.css",StringComparison.Ordinal)<0)throw new InvalidDataException("Compact widget script or stylesheet not linked.");
      StringBuilder log = new StringBuilder();
      log.AppendLine("PASS Mooncat Desktop 0.2.2 x64");
      log.AppendLine("Embedded archive SHA256: " + archiveHash);
      log.AppendLine("WebView2 SDK: 1.0.4258.31 (official Microsoft NuGet)");
      log.AppendLine("Installed runtime: " + runtime);
      log.AppendLine("Framework: " + Environment.Version);
      log.AppendLine("Profile: " + Program.Profile);
      log.AppendLine("Assets: " + Program.AssetRoot);
      log.AppendLine("Expected compact widget, garden HTML and game/audio scripts: PASS");
      log.AppendLine("Native cat PNG sprite: "+petWidth+" × "+petHeight+"; uniform 4 × 2 grid, 8 walking frames: PASS");
      log.AppendLine("Native cat transparent background alpha: "+petCornerAlpha+" (PASS)");
      log.AppendLine("Eight-frame diagonal gait LF+RH / RF+LH; short paws with common ground sole: PASS");
      log.AppendLine("Archive path validation, resource digest and extraction: PASS");
      foreach (string path in Directory.GetFiles(Program.AssetRoot,"*",SearchOption.AllDirectories)) log.AppendLine(Path.GetFileName(path) + " " + new FileInfo(path).Length);
      File.WriteAllText(Path.Combine(Program.Profile,"self-test.log"),log.ToString(),Encoding.UTF8);
      Console.WriteLine(log.ToString());
      return 0;
    }
    private static void ValidateDiagonalGait(){
      string svg=File.ReadAllText(Path.Combine(Program.AssetRoot,"assets","cat-walk.svg"),Encoding.UTF8);
      var limbs=Regex.Matches(svg,"data-limb=\"(?<name>[^\"]+)\"\\s+data-anatomy=\"[^\"]+\"\\s+data-phase=\"(?<phase>[^\"]+)\"\\s+data-stance=\"(?<stance>[^\"]+)\"\\s+data-sole=\"(?<sole>[^\"]+)\"");
      if(limbs.Count!=32)throw new InvalidDataException("Eight diagonal frames must describe exactly four limbs each.");
      for(int frame=0;frame<8;frame++){
        var stance=new Dictionary<string,string>();
        for(int leg=0;leg<4;leg++){
          Match m=limbs[frame*4+leg];string name=m.Groups["name"].Value;
          if((name!="LF"&&name!="RH"&&name!="RF"&&name!="LH")||stance.ContainsKey(name))throw new InvalidDataException("Incomplete native cat anatomy.");
          string expected=name=="LF"||name=="RH"?"0":"PI";
          if(m.Groups["phase"].Value!=expected)throw new InvalidDataException("Native cat phases must alternate diagonally.");
          stance.Add(name,m.Groups["stance"].Value);
          double sole=Double.Parse(m.Groups["sole"].Value,System.Globalization.CultureInfo.InvariantCulture);
          if(sole<217.9||sole>230.01||(stance[name]=="true"&&Math.Abs(sole-230)>.01))throw new InvalidDataException("Native cat planted paws do not share their ground line.");
        }
        if(stance["LF"]!=stance["RH"]||stance["RF"]!=stance["LH"])throw new InvalidDataException("Native cat diagonal feet must share stance phase.");
      }
    }
  }

  internal static class DesktopApplication {
    internal static int Run() {
      string runtime;
      try { runtime = CoreWebView2Environment.GetAvailableBrowserVersionString(); }
      catch (WebView2RuntimeNotFoundException) {
        if (Program.IsRuntimeTest) { Program.ReportError(new InvalidOperationException("WebView2 Runtime missing.")); return 2; }
        MessageBox.Show("这台电脑还没有 Microsoft Edge WebView2 运行时。\n\n安装微软官方 WebView2 Evergreen 运行时后，再打开 Winesun 的小花园。\nhttps://developer.microsoft.com/microsoft-edge/webview2/", "需要微软 WebView2 运行时",MessageBoxButtons.OK,MessageBoxIcon.Information);
        return 2;
      }
      Application.Run(new GardenWindow());
      return Program.ResultCode;
    }
  }

  internal sealed class GardenWindow : Form {
    private enum ViewMode {Expanded,Garden,Cat}
    private ViewMode mode=ViewMode.Expanded;
    private readonly WebView2 view;
    private readonly Label loading;
    private readonly NotifyIcon tray;
    private readonly System.Web.Script.Serialization.JavaScriptSerializer json=new System.Web.Script.Serialization.JavaScriptSerializer();
    private RoamingCatForm cat;
    private Rectangle normalBounds;
    private bool fullscreen,closingForExit,reducedMotion,widgetPinned=true,observatoryPinned;
    private bool layoutChanging,wasMinimized,restoringWindow;
    private bool startupMusicPending=true,qaRunning,hasWidgetPosition;
    private Point widgetPosition;
    private int navigationCount;
    private string page;
    [DllImport("dwmapi.dll")]private static extern int DwmSetWindowAttribute(IntPtr h,int a,ref int value,int size);
    [DllImport("user32.dll")]private static extern bool ReleaseCapture();
    [DllImport("user32.dll")]private static extern IntPtr SendMessage(IntPtr h,int m,int w,int l);
    [DllImport("user32.dll")]private static extern bool IsIconic(IntPtr h);
    [DllImport("user32.dll")]private static extern int GetWindowLong(IntPtr h,int index);

    internal GardenWindow(){
      Text="Winesun 的小花园";FormBorderStyle=FormBorderStyle.Sizable;StartPosition=FormStartPosition.Manual;ClientSize=new Size(1280,850);MinimumSize=new Size(960,640);ShowInTaskbar=true;
      BackColor=Color.FromArgb(24,35,38);ForeColor=Color.FromArgb(239,232,211);AutoScaleMode=AutoScaleMode.Dpi;AutoScaleDimensions=new SizeF(96,96);KeyPreview=true;
      try{using(var s=Program.ThisAssembly.GetManifestResourceStream("Mooncat.icon.ico"))Icon=new Icon(s);}catch{}
      ReadWindowSettings();
      loading=new Label{Text="Winesun 正在打开星光…",Dock=DockStyle.Fill,TextAlign=ContentAlignment.MiddleCenter,Font=new Font("Microsoft YaHei UI",11),BackColor=BackColor,ForeColor=ForeColor};
      view=new WebView2{Dock=DockStyle.Fill,DefaultBackgroundColor=BackColor};Controls.Add(view);Controls.Add(loading);loading.BringToFront();
      var menu=new ContextMenuStrip();menu.Items.Add("打开星光主页",null,delegate{RequestMode(ViewMode.Expanded);});menu.Items.Add("显示花园和 Winesun",null,delegate{RequestMode(ViewMode.Garden);});menu.Items.Add("只显示任务栏小猫",null,delegate{RequestMode(ViewMode.Cat);});menu.Items.Add(new ToolStripSeparator());menu.Items.Add("退出 Mooncat",null,delegate{closingForExit=true;Close();});
      tray=new NotifyIcon{Icon=Icon,Text="Winesun 的小花园",ContextMenuStrip=menu,Visible=!Program.IsRuntimeTest};tray.DoubleClick+=delegate{RequestMode(ViewMode.Expanded);};
      Shown+=async delegate{
        if(Program.IsRuntimeTest){mode=Program.InitialTestMode=="compact"?ViewMode.Garden:Program.InitialTestMode=="peek"?ViewMode.Cat:ViewMode.Expanded;}
        ApplyMainLayout(mode==ViewMode.Expanded?ViewMode.Expanded:ViewMode.Garden);
        if(mode!=ViewMode.Expanded){EnsureCat();cat.SetPetVisible(true);if(mode==ViewMode.Cat)MinimizeToTaskbar();}
        await Initialize();
      };
      if(Program.ShowRequest!=null){var show=new Timer{Interval=350};show.Tick+=delegate{if(Program.ShowRequest.WaitOne(0))RequestMode(ViewMode.Expanded);};show.Start();FormClosed+=delegate{show.Dispose();};}
      LocationChanged+=delegate{if(mode==ViewMode.Garden && !layoutChanging && WindowState==FormWindowState.Normal && !Program.IsRuntimeTest){widgetPosition=Location;hasWidgetPosition=true;SaveWindowSettings();}};
      Resize+=HandleWindowResize;
      FormClosing+=delegate(object sender,FormClosingEventArgs e){if(!closingForExit && e.CloseReason==CloseReason.UserClosing){e.Cancel=true;MinimizeToTaskbar();return;}if(cat!=null){cat.Dispose();cat=null;}SaveWindowSettings();tray.Visible=false;tray.Dispose();menu.Dispose();view.Dispose();};
      if(Program.IsRuntimeTest){var timeout=new Timer{Interval=50000};timeout.Tick+=delegate{timeout.Stop();Program.ReportError(new TimeoutException("Native smoke test timed out."));closingForExit=true;Close();};timeout.Start();FormClosed+=delegate{timeout.Dispose();};}
    }
    protected override void OnHandleCreated(EventArgs e){base.OnHandleCreated(e);try{int dark=1,round=2;DwmSetWindowAttribute(Handle,20,ref dark,4);DwmSetWindowAttribute(Handle,33,ref round,4);}catch{}}
    private float ScaleFactor{get{using(var g=CreateGraphics())return g.DpiX/96f;}}
    private Rectangle TestOffscreen(Rectangle value){if(Program.IsRuntimeTest)value.Location=new Point(-32000,-32000);return value;}
    private Rectangle DefaultGarden(){float s=ScaleFactor;var area=hasWidgetPosition?Screen.FromPoint(widgetPosition).WorkingArea:Screen.PrimaryScreen.WorkingArea;Point p=hasWidgetPosition?widgetPosition:new Point(area.Right-(int)(350*s)-24,area.Top+24);return TestOffscreen(new Rectangle(Math.Max(area.Left,Math.Min(p.X,area.Right-(int)(350*s))),Math.Max(area.Top,Math.Min(p.Y,area.Bottom-(int)(440*s))),(int)(350*s),(int)(440*s)));}
    private void ApplyMainLayout(ViewMode value){
      layoutChanging=true;
      try{if(fullscreen)SetFullScreen(false);float s=ScaleFactor;WindowState=FormWindowState.Normal;Opacity=1;ShowInTaskbar=true;FormBorderStyle=value==ViewMode.Expanded?FormBorderStyle.Sizable:FormBorderStyle.None;
        MinimumSize=value==ViewMode.Expanded?new Size((int)(960*s),(int)(640*s)):new Size((int)(300*s),(int)(360*s));TopMost=!Program.IsRuntimeTest && (value==ViewMode.Garden?widgetPinned:observatoryPinned);
        if(value==ViewMode.Garden)Bounds=DefaultGarden();else{var area=Screen.PrimaryScreen.WorkingArea;ClientSize=new Size(Math.Min((int)(1280*s),area.Width-40),Math.Min((int)(850*s),area.Height-60));Location=new Point(area.Left+(area.Width-Width)/2,area.Top+(area.Height-Height)/2);Bounds=TestOffscreen(Bounds);SetFullScreen(true);}
        wasMinimized=false;
      }finally{layoutChanging=false;}
    }
    private void SetFullScreen(bool enter){if(enter==fullscreen)return;fullscreen=enter;if(enter){normalBounds=Bounds;WindowState=FormWindowState.Normal;FormBorderStyle=FormBorderStyle.None;Bounds=TestOffscreen(Screen.FromControl(this).Bounds);}else{FormBorderStyle=FormBorderStyle.Sizable;Bounds=TestOffscreen(normalBounds);}SendState();}
    private async Task Initialize(){
      try{
        var environment=await CoreWebView2Environment.CreateAsync(null,Path.Combine(Program.Profile,"save-profile"),new CoreWebView2EnvironmentOptions("--autoplay-policy=no-user-gesture-required --disable-background-timer-throttling --disable-renderer-backgrounding"));await view.EnsureCoreWebView2Async(environment);var core=view.CoreWebView2;
        core.Settings.AreDevToolsEnabled=false;core.Settings.AreDefaultContextMenusEnabled=false;core.Settings.IsStatusBarEnabled=false;core.Settings.IsZoomControlEnabled=false;core.Settings.AreBrowserAcceleratorKeysEnabled=false;
        core.SetVirtualHostNameToFolderMapping("mooncat.local",Program.AssetRoot,CoreWebView2HostResourceAccessKind.DenyCors);
        core.NavigationStarting+=delegate(object sender,CoreWebView2NavigationStartingEventArgs e){Uri u;if(!Uri.TryCreate(e.Uri,UriKind.Absolute,out u)||u.Scheme!="https"||u.Host!="mooncat.local")e.Cancel=true;};
        core.NewWindowRequested+=delegate(object sender,CoreWebView2NewWindowRequestedEventArgs e){e.Handled=true;};core.PermissionRequested+=delegate(object sender,CoreWebView2PermissionRequestedEventArgs e){e.State=CoreWebView2PermissionState.Deny;};core.DownloadStarting+=delegate(object sender,CoreWebView2DownloadStartingEventArgs e){e.Cancel=true;};
        core.AddWebResourceRequestedFilter("*",CoreWebView2WebResourceContext.All);core.WebResourceRequested+=delegate(object sender,CoreWebView2WebResourceRequestedEventArgs e){Uri u;if(Uri.TryCreate(e.Request.Uri,UriKind.Absolute,out u)&&(u.Scheme=="http"||u.Scheme=="https")&&(u.Scheme!="https"||u.Host!="mooncat.local"))e.Response=environment.CreateWebResourceResponse(new MemoryStream(),403,"Offline garden","Content-Type: text/plain");};
        if(Program.IsRuntimeTest)await core.AddScriptToExecuteOnDocumentCreatedAsync("Object.defineProperty(window,'MoonAudio',{configurable:true,set(C){delete window.MoonAudio;window.MoonAudio=new Proxy(C,{construct(T,args,N){const a=Reflect.construct(T,args,N);window.__nativeAudio=a;return a;}});}});");
        await core.AddScriptToExecuteOnDocumentCreatedAsync("window.MOONCAT_DESKTOP=true;window.__nativeErrors=[];addEventListener('error',e=>window.__nativeErrors.push(e.message||'resource error'));addEventListener('unhandledrejection',e=>window.__nativeErrors.push(String(e.reason)));");
        core.WebMessageReceived+=HandleMessage;core.ContainsFullScreenElementChanged+=delegate{SetFullScreen(core.ContainsFullScreenElement);};
        // WebView2 blocks its browser while accelerator handlers run; defer host/renderer messages.
        KeyEventHandler keys=delegate(object sender,KeyEventArgs e){if(e.Handled)return;if(e.KeyCode==Keys.F11){e.SuppressKeyPress=true;BeginInvoke(new Action(delegate{if(mode==ViewMode.Expanded)SetFullScreen(!fullscreen);else RequestMode(ViewMode.Expanded);}));}if(e.KeyCode==Keys.Escape && mode==ViewMode.Expanded){e.SuppressKeyPress=true;BeginInvoke(new Action(async delegate{await HandleEscape();}));}};KeyDown+=keys;view.KeyDown+=keys;
        core.NavigationCompleted+=async delegate(object sender,CoreWebView2NavigationCompletedEventArgs e){
          navigationCount++;if(!e.IsSuccess){Program.ReportError(new InvalidOperationException("Local page load failed: "+e.WebErrorStatus));if(Program.IsRuntimeTest){closingForExit=true;Close();}return;}
          loading.Visible=false;SendState();Trace("Navigation "+navigationCount+" "+core.Source+" mode="+mode+" fullscreen="+fullscreen);
          if(Program.IsRuntimeTest && !qaRunning){qaRunning=true;try{await RunRuntimeQa(core);}catch(Exception ex){Program.ReportError(ex);}closingForExit=true;Close();}
        };
        core.ProcessFailed+=delegate{Program.ReportError(new InvalidOperationException("Local renderer stopped."));};Navigate(mode==ViewMode.Expanded?"index.html":"widget.html");
      }catch(Exception ex){Program.ReportError(ex);if(Program.IsRuntimeTest){closingForExit=true;Close();}}
    }
    private async Task CaptureRuntimePreview(CoreWebView2 core,string outputPath){
      if(String.IsNullOrEmpty(outputPath))return;
      await Task.Delay(200);Directory.CreateDirectory(Path.GetDirectoryName(outputPath));
      using(var file=new FileStream(outputPath,FileMode.Create))await core.CapturePreviewAsync(CoreWebView2CapturePreviewImageFormat.Png,file);
    }
    private async Task RunRuntimeQa(CoreWebView2 core){
      await Task.Delay(1100);
      if(Program.TestTransitions)await VerifyTransitions(core);
      if(Program.TestCatPause)await VerifyCatPause(core);
      if(Program.TestRoamer){EnsureCat();Trace(cat.VerifyNativeFrames());}
      if(Program.TestSpriteFrames){EnsureCat();Trace(cat.VerifySpriteFrames());}
      if(!Program.CaptureAfterQa)await CaptureRuntimePreview(core,Program.CapturePreviewPath);
      if(Program.InitialTestMode=="expanded" && !Program.TestTransitions){
        string audio=await core.ExecuteScriptAsync("JSON.stringify({state:window.__nativeAudio?.ctx?.state,time:window.__nativeAudio?.ctx?.currentTime,playing:document.body.classList.contains('music-playing')})");
        Trace("Startup audio before interaction: "+audio+"; document playing="+core.IsDocumentPlayingAudio);
        string clock=await core.ExecuteScriptAsync("window.__nativeAudio?.ctx?.currentTime");await Task.Delay(250);
        string nextClock=await core.ExecuteScriptAsync("window.__nativeAudio?.ctx?.currentTime");double before,after;
        if(!Double.TryParse(clock,System.Globalization.NumberStyles.Float,System.Globalization.CultureInfo.InvariantCulture,out before)||!Double.TryParse(nextClock,System.Globalization.NumberStyles.Float,System.Globalization.CultureInfo.InvariantCulture,out after)||after<=before)throw new InvalidDataException("Startup music AudioContext did not advance without interaction.");
      }
      string script=Program.QaScript??"JSON.stringify({title:document.title,url:location.href,desktop:window.MOONCAT_DESKTOP,ready:document.readyState,viewport:[innerWidth,innerHeight],errors:window.__nativeErrors,images:[...document.images].map(i=>i.currentSrc),storage:!!localStorage})";
      string result=await core.ExecuteScriptAsync("(function(){try{return eval("+json.Serialize(script)+");}catch(error){return JSON.stringify({__qaError:String(error.message||error),stack:String(error.stack||'')});}})()");
      if(String.IsNullOrEmpty(result)||result=="null")throw new InvalidDataException("Native page script returned no result.");
      if(result.IndexOf("__qaError",StringComparison.Ordinal)>=0){string inner=json.Deserialize<string>(result);var failure=json.Deserialize<Dictionary<string,object>>(inner);throw new InvalidDataException("Native UI QA failed: "+Convert.ToString(failure["__qaError"])+"\r\n"+Convert.ToString(failure["stack"]));}
      if(Program.CaptureAfterQa)await CaptureRuntimePreview(core,Program.CapturePreviewPath);
      await CaptureRuntimePreview(core,Program.CapturePostQaPath);
      File.WriteAllText(Path.Combine(Program.Profile,"runtime-test.log"),"PASS Mooncat 0.2.2 native state "+mode+"\r\n"+result,Encoding.UTF8);
    }
    private void Navigate(string value){if(view.CoreWebView2==null)return;if(page==value){SendState();return;}page=value;loading.Visible=true;loading.BringToFront();view.CoreWebView2.Navigate("https://mooncat.local/"+value);}
    private void HandleMessage(object sender,CoreWebView2WebMessageReceivedEventArgs e){Uri u;if(!Uri.TryCreate(e.Source,UriKind.Absolute,out u)||u.Scheme!="https"||u.Host!="mooncat.local")return;try{object data=json.DeserializeObject(e.WebMessageAsJson);var map=data as Dictionary<string,object>;string command=map!=null && map.ContainsKey("type")?Convert.ToString(map["type"]):data as string;switch(command){case "ready":SendState();break;case "expand":RequestMode(ViewMode.Expanded);break;case "compact":RequestMode(ViewMode.Garden);break;case "peek":RequestMode(ViewMode.Cat);break;case "hide":case "close":case "minimize":MinimizeToTaskbar();break;case "drag":ReleaseCapture();SendMessage(Handle,0xA1,2,0);break;case "pin":TopMost=!TopMost;if(mode==ViewMode.Garden)widgetPinned=TopMost;else observatoryPinned=TopMost;SaveWindowSettings();SendState();break;case "toggle-fullscreen":if(mode==ViewMode.Expanded)SetFullScreen(!fullscreen);break;case "motion-preference":if(map.ContainsKey("reduced"))reducedMotion=Convert.ToBoolean(map["reduced"]);if(cat!=null)cat.SetReducedMotion(reducedMotion);break;}}catch(Exception ex){Trace("Rejected host payload: "+ex.Message);}}
    private string ModeName{get{return mode==ViewMode.Expanded?"expanded":mode==ViewMode.Garden?"garden":"cat";}}
    private void SendState(){if(view.CoreWebView2==null)return;bool initial=mode==ViewMode.Expanded && page=="index.html" && startupMusicPending;view.CoreWebView2.PostWebMessageAsJson(json.Serialize(new{type="window-state",mode=ModeName,compact=mode==ViewMode.Garden,pet=mode==ViewMode.Cat,pinned=TopMost,fullscreen=fullscreen,minimized=WindowState==FormWindowState.Minimized,catVisible=cat!=null&&cat.Visible,transitioning=false,startup=initial,autoplay=initial,musicResumeAllowed=!initial}));if(initial)startupMusicPending=false;}
    private void EnsureCat(){if(cat==null){cat=new RoamingCatForm(delegate{RequestMode(ViewMode.Garden);},delegate{MinimizeToTaskbar();},delegate{closingForExit=true;Close();});cat.SetReducedMotion(reducedMotion);}}
    private void RequestMode(ViewMode requested){
      mode=requested;
      if(requested==ViewMode.Expanded){if(cat!=null)cat.SetPetVisible(false);ApplyMainLayout(mode);Show();Navigate("index.html");if(!Program.IsRuntimeTest)Activate();SendState();return;}
      ApplyMainLayout(ViewMode.Garden);Show();Navigate("widget.html");EnsureCat();cat.SetPetVisible(true);
      if(requested==ViewMode.Cat)MinimizeToTaskbar();else{if(!Program.IsRuntimeTest)Activate();SendState();SaveWindowSettings();}
    }
    private void MinimizeToTaskbar(){
      if(mode==ViewMode.Expanded){if(cat!=null)cat.SetPetVisible(false);}else{EnsureCat();cat.SetPetVisible(true);}
      ShowInTaskbar=true;Show();WindowState=FormWindowState.Minimized;SendState();
    }
    private void HandleWindowResize(object sender,EventArgs args){
      if(WindowState==FormWindowState.Minimized){wasMinimized=true;SendState();return;}
      if(!wasMinimized || layoutChanging || restoringWindow)return;
      wasMinimized=false;restoringWindow=true;
      try{RequestMode(mode==ViewMode.Cat?ViewMode.Garden:mode);}finally{restoringWindow=false;}
    }
    private async Task HandleEscape(){
      if(IsDisposed || view.CoreWebView2==null)return;
      try{string closed=await view.CoreWebView2.ExecuteScriptAsync("(function(){const dialog=document.querySelector('dialog[open]');if(!dialog)return false;dialog.close();return true;})()");if(closed!="true" && fullscreen)SetFullScreen(false);}catch(Exception ex){Trace("Escape handler: "+ex.Message);}
    }
    private void Trace(string text){if(Program.IsRuntimeTest)File.AppendAllText(Path.Combine(Program.Profile,"runtime-trace.log"),DateTime.UtcNow.ToString("o")+" "+text+"\r\n",Encoding.UTF8);}
    private void ReadWindowSettings(){try{string path=Path.Combine(Program.Profile,"desktop-window.json");if(!File.Exists(path))return;var state=json.Deserialize<Dictionary<string,object>>(File.ReadAllText(path));if(state.ContainsKey("x")&&state.ContainsKey("y")){widgetPosition=new Point(Convert.ToInt32(state["x"]),Convert.ToInt32(state["y"]));hasWidgetPosition=true;}if(state.ContainsKey("widgetPinned"))widgetPinned=Convert.ToBoolean(state["widgetPinned"]);if(state.ContainsKey("observatoryPinned"))observatoryPinned=Convert.ToBoolean(state["observatoryPinned"]);}catch{}}
    private void SaveWindowSettings(){if(Program.IsRuntimeTest || WindowState==FormWindowState.Minimized)return;try{Point position=hasWidgetPosition?widgetPosition:DefaultGarden().Location;File.WriteAllText(Path.Combine(Program.Profile,"desktop-window.json"),json.Serialize(new{x=position.X,y=position.Y,widgetPinned=widgetPinned,observatoryPinned=observatoryPinned}),Encoding.UTF8);}catch{}}
    private async Task VerifyCatPause(CoreWebView2 core){
      if(mode!=ViewMode.Garden)throw new InvalidDataException("Cat pause test requires compact mode.");
      await core.ExecuteScriptAsync("window.__catPauseCount=0;window.__catResumeCount=0;window.__catTickCount=0;window.__catDocumentToken='live-widget';for(const [name,key] of [['pause','__catPauseCount'],['resume','__catResumeCount'],['backgroundTick','__catTickCount']]){const original=MoonGame.prototype[name];MoonGame.prototype[name]=function(){window[key]++;window.__catGame=this;return original.apply(this,arguments);};}window.__nativeAudio.playMusic({fadeIn:.15}).catch(e=>window.__nativeErrors.push(String(e)));");
      await Task.Delay(500);string first=await core.ExecuteScriptAsync("window.__nativeAudio.ctx.currentTime");
      await core.ExecuteScriptAsync("window.chrome.webview.postMessage({type:'peek'});");await Task.Delay(3100);
      var hidden=json.Deserialize<Dictionary<string,object>>(await core.ExecuteScriptAsync("({pause:window.__catPauseCount,ticks:window.__catTickCount,state:window.__catGame?.state,timer:!!window.__catGame?.timer,frame:!!window.__catGame?.frameId,same:window.__catDocumentToken==='live-widget'})"));
      if(mode!=ViewMode.Cat || WindowState!=FormWindowState.Minimized || !ShowInTaskbar || cat==null || !cat.Visible || Convert.ToInt32(hidden["pause"])<1 || Convert.ToInt32(hidden["ticks"])<1 || Convert.ToString(hidden["state"])!="paused" || Convert.ToBoolean(hidden["timer"]) || Convert.ToBoolean(hidden["frame"]) || !Convert.ToBoolean(hidden["same"]))throw new InvalidDataException("Actual cat bridge did not pause garden and enable its background tick: "+json.Serialize(hidden));
      string second=await core.ExecuteScriptAsync("window.__nativeAudio.ctx.currentTime");double before=Double.Parse(first,System.Globalization.CultureInfo.InvariantCulture),after=Double.Parse(second,System.Globalization.CultureInfo.InvariantCulture);
      if(after<=before+2 || !core.IsDocumentPlayingAudio)throw new InvalidDataException("Music stopped while garden was a native cat.");
      Trace("PASS actual cat state pauses game; backgroundTick="+hidden["ticks"]+"; music clock advanced "+(after-before).ToString("0.00",System.Globalization.CultureInfo.InvariantCulture)+"s; document playing=True");
      await core.ExecuteScriptAsync("window.chrome.webview.postMessage({type:'compact'});");await Task.Delay(750);
      var shown=json.Deserialize<Dictionary<string,object>>(await core.ExecuteScriptAsync("({resume:window.__catResumeCount,state:window.__catGame?.state,same:window.__catDocumentToken==='live-widget',audio:window.__nativeAudio.ctx.state,errors:window.__nativeErrors.length})"));
      if(mode!=ViewMode.Garden || WindowState!=FormWindowState.Normal || !Visible || !cat.Visible || Convert.ToInt32(shown["resume"])<1 || Convert.ToString(shown["state"])!="running" || !Convert.ToBoolean(shown["same"]) || Convert.ToString(shown["audio"])!="running" || Convert.ToInt32(shown["errors"])!=0 || !core.IsDocumentPlayingAudio)throw new InvalidDataException("Actual garden return did not resume same document and music: "+json.Serialize(shown));
      Trace("PASS actual garden return resumes game; same document and continuous music");
    }
    private async Task VerifyTransitions(CoreWebView2 core){
      if(mode!=ViewMode.Expanded)RequestMode(ViewMode.Expanded);await Task.Delay(500);
      if(!fullscreen || !ShowInTaskbar || cat!=null && cat.Visible)throw new InvalidDataException("Startup must be fullscreen home without desktop cat.");
      await core.ExecuteScriptAsync("document.querySelector('[data-open=\"gameDialog\"]').click();");await Task.Delay(150);await HandleEscape();
      if(!fullscreen || await core.ExecuteScriptAsync("document.querySelector('#gameDialog').open")!="false")throw new InvalidDataException("First Escape must close the garden modal and retain fullscreen.");
      await HandleEscape();if(fullscreen)throw new InvalidDataException("Second Escape must exit fullscreen.");SetFullScreen(true);Trace("PASS Escape closes open garden dialog first; second Escape exits fullscreen");
      await core.ExecuteScriptAsync("window.chrome.webview.postMessage({type:'hide'});");await Task.Delay(180);
      if(WindowState!=FormWindowState.Minimized || !IsIconic(Handle) || !ShowInTaskbar || (GetWindowLong(Handle,-20)&0x40000)==0 || cat!=null&&cat.Visible)throw new InvalidDataException("Home minimize must preserve a real taskbar app entry without cat.");
      WindowState=FormWindowState.Normal;await Task.Delay(180);
      if(mode!=ViewMode.Expanded || !fullscreen || WindowState!=FormWindowState.Normal || cat!=null&&cat.Visible)throw new InvalidDataException("Taskbar home restore must return to fullscreen without cat.");Trace("PASS home native minimize/restore preserves taskbar entry and fullscreen");
      await core.ExecuteScriptAsync("window.chrome.webview.postMessage({type:'compact'});");await Task.Delay(650);
      if(mode!=ViewMode.Garden || WindowState!=FormWindowState.Normal || !Visible || !ShowInTaskbar || cat==null || !cat.Visible)throw new InvalidDataException("Departure must show garden and desktop cat together.");
      await core.ExecuteScriptAsync("window.__nativeIdentity='retained';window.__nativeAudio.playMusic({fadeIn:.15}).catch(e=>window.__nativeErrors.push(String(e)));window.__minPause=0;window.__minTick=0;for(const [name,key] of [['pause','__minPause'],['backgroundTick','__minTick']]){const original=MoonGame.prototype[name];MoonGame.prototype[name]=function(){window[key]++;window.__minGame=this;return original.apply(this,arguments);};}");await Task.Delay(400);
      Trace("PASS departure shows garden + one desktop cat with no shape animation");
      await core.ExecuteScriptAsync("window.chrome.webview.postMessage({type:'minimize'});");await Task.Delay(180);
      if(WindowState!=FormWindowState.Minimized || !IsIconic(Handle) || !ShowInTaskbar || !cat.Visible)throw new InvalidDataException("Garden minimize must leave cat walking and taskbar app accessible.");
      WindowState=FormWindowState.Normal;await Task.Delay(180);
      if(mode!=ViewMode.Garden || WindowState!=FormWindowState.Normal || !Visible || !cat.Visible)throw new InvalidDataException("Taskbar garden restore must show both garden and cat.");
      string audioBefore=await core.ExecuteScriptAsync("window.__nativeAudio.ctx.currentTime");
      await core.ExecuteScriptAsync("window.chrome.webview.postMessage({type:'peek'});");await Task.Delay(2300);
      if(mode!=ViewMode.Cat || WindowState!=FormWindowState.Minimized || !ShowInTaskbar || !IsIconic(Handle) || !cat.Visible)throw new InvalidDataException("Peek must minimize garden to taskbar and retain native cat.");
      var idle=json.Deserialize<Dictionary<string,object>>(await core.ExecuteScriptAsync("({pause:window.__minPause,ticks:window.__minTick,state:window.__minGame?.state})"));
      if(Convert.ToInt32(idle["pause"])<1 || Convert.ToInt32(idle["ticks"])<1 || Convert.ToString(idle["state"])!="paused")throw new InvalidDataException("Minimized garden did not use paused drawing and two-second background care: "+json.Serialize(idle));
      string audioAfter=await core.ExecuteScriptAsync("window.__nativeAudio.ctx.currentTime");double before=Double.Parse(audioBefore,System.Globalization.CultureInfo.InvariantCulture),after=Double.Parse(audioAfter,System.Globalization.CultureInfo.InvariantCulture);
      if(after-before<2 || !core.IsDocumentPlayingAudio)throw new InvalidDataException("Minimized garden music did not continue.");Trace("PASS cat-only taskbar state pauses drawing, runs background care, and music advances "+(after-before).ToString("0.00",System.Globalization.CultureInfo.InvariantCulture)+"s");
      cat.VerifyGardenDoubleClick();await Task.Delay(180);
      if(mode!=ViewMode.Garden || WindowState!=FormWindowState.Normal || !Visible || !cat.Visible)throw new InvalidDataException("Cat double-click must display garden and keep the cat, without animation.");
      string identity=await core.ExecuteScriptAsync("window.__nativeIdentity");if(identity!="\"retained\"")throw new InvalidDataException("Garden/music document was recreated.");Trace("PASS real cat double-click restores garden immediately; same document and cat coexist");
      Close();await Task.Delay(180);if(WindowState!=FormWindowState.Minimized || !ShowInTaskbar || !cat.Visible)throw new InvalidDataException("User close must minimize the app to taskbar.");
      WindowState=FormWindowState.Normal;await Task.Delay(180);if(mode!=ViewMode.Garden || !Visible || !cat.Visible)throw new InvalidDataException("Closed-to-taskbar garden must remain restorable.");
      RequestMode(ViewMode.Cat);WindowState=FormWindowState.Normal;await Task.Delay(180);if(mode!=ViewMode.Garden || !Visible || !cat.Visible)throw new InvalidDataException("Taskbar restore from cat-only must display garden and cat.");Trace("PASS close/minimize/peek keep taskbar entry and all restore routes work");
      RequestMode(ViewMode.Cat);RequestMode(ViewMode.Garden);RequestMode(ViewMode.Cat);RequestMode(ViewMode.Garden);
      if(mode!=ViewMode.Garden || WindowState!=FormWindowState.Normal || !cat.Visible)throw new InvalidDataException("Immediate mode toggles must end in requested garden + cat state.");
      RequestMode(ViewMode.Expanded);await Task.Delay(550);if(!fullscreen || WindowState!=FormWindowState.Normal || !Visible || cat.Visible)throw new InvalidDataException("Return to fullscreen home must hide cat.");Trace("PASS immediate toggles and fullscreen home return; no shape transition exists");
      string errors=await core.ExecuteScriptAsync("JSON.stringify(window.__nativeErrors)");if(errors!="\"[]\"")throw new InvalidDataException("Page errors during state transitions: "+errors);
    }
  }
}
