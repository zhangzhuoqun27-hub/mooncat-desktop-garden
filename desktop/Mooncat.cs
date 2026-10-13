using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

[assembly: AssemblyTitle("Mooncat · 月球小花园")]
[assembly: AssemblyDescription("A quiet original desktop garden under the stars.")]
[assembly: AssemblyCompany("Mooncat")]
[assembly: AssemblyProduct("Mooncat Desktop")]
[assembly: AssemblyVersion("0.1.0.0")]
[assembly: AssemblyFileVersion("0.1.0.0")]

namespace MooncatDesktop {
  internal static class Program {
    internal static string Profile, AssetRoot, SdkRoot, QaScript;
    internal static string InitialTestMode="compact";
    internal static string CapturePreviewPath;
    internal static bool IsRuntimeTest;
    internal static bool TestTransitions;
    internal static bool TestRoamer;
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
      MessageBox.Show("花园暂时没能打开。\n\n" + ex.Message + "\n\n错误记录：" + Path.Combine(Profile ?? "", "last-error.log"), "月白的小花园", MessageBoxButtons.OK, MessageBoxIcon.Information);
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
      foreach (string file in new [] { "index.html", "game.js", "audio.js", "app.js", "widget.html", "widget.css", "widget.js" }) {
        string path = Path.Combine(Program.AssetRoot,file);
        if (!File.Exists(path) || new FileInfo(path).Length == 0) throw new InvalidDataException("Required asset missing: " + file);
        if (file.EndsWith(".js") && file != "widget.js" && index.IndexOf(file, StringComparison.Ordinal) < 0) throw new InvalidDataException("Script not linked: " + file);
      }
      if(widget.IndexOf("widget.js",StringComparison.Ordinal)<0 || widget.IndexOf("widget.css",StringComparison.Ordinal)<0)throw new InvalidDataException("Compact widget script or stylesheet not linked.");
      StringBuilder log = new StringBuilder();
      log.AppendLine("PASS Mooncat Desktop 0.1.0 x64");
      log.AppendLine("Embedded archive SHA256: " + archiveHash);
      log.AppendLine("WebView2 SDK: 1.0.4258.31 (official Microsoft NuGet)");
      log.AppendLine("Installed runtime: " + runtime);
      log.AppendLine("Framework: " + Environment.Version);
      log.AppendLine("Profile: " + Program.Profile);
      log.AppendLine("Assets: " + Program.AssetRoot);
      log.AppendLine("Expected compact widget, garden HTML and game/audio scripts: PASS");
      log.AppendLine("Native cat PNG sprite: "+petWidth+" × "+petHeight+"; uniform 4 × 2 grid, 8 walking frames: PASS");
      log.AppendLine("Native cat transparent background alpha: "+petCornerAlpha+" (PASS)");
      log.AppendLine("Archive path validation, resource digest and extraction: PASS");
      foreach (string path in Directory.GetFiles(Program.AssetRoot,"*",SearchOption.AllDirectories)) log.AppendLine(Path.GetFileName(path) + " " + new FileInfo(path).Length);
      File.WriteAllText(Path.Combine(Program.Profile,"self-test.log"),log.ToString(),Encoding.UTF8);
      Console.WriteLine(log.ToString());
      return 0;
    }
  }

  internal static class DesktopApplication {
    internal static int Run() {
      string runtime;
      try { runtime = CoreWebView2Environment.GetAvailableBrowserVersionString(); }
      catch (WebView2RuntimeNotFoundException) {
        if (Program.IsRuntimeTest) { Program.ReportError(new InvalidOperationException("WebView2 Runtime missing.")); return 2; }
        MessageBox.Show("这台电脑还没有 Microsoft Edge WebView2 运行时。\n\n安装微软官方 WebView2 Evergreen 运行时后，再打开月白的小花园。\nhttps://developer.microsoft.com/microsoft-edge/webview2/", "需要微软 WebView2 运行时",MessageBoxButtons.OK,MessageBoxIcon.Information);
        return 2;
      }
      Application.Run(new GardenWindow());
      return Program.ResultCode;
    }
  }

  internal sealed class GardenWindow : Form {
    private readonly WebView2 view;
    private readonly Label loading;
    private Rectangle normalBounds;
    private FormWindowState normalState;
    private bool fullscreen;
    private bool compact=true, petPeek=false, closingForExit, changingMode;
    private bool transitioning, reducedMotion;
    private Timer transitionTimer;
    private Rectangle transitionTarget;
    private int navigationCount;
    private bool widgetPinned=true, observatoryPinned=false;
    private bool roamingEnabled=true;
    private RoamingCatForm roamer;
    private readonly ToolStripMenuItem roamingItem;
    private Point widgetPosition;
    private bool hasWidgetPosition;
    private readonly NotifyIcon tray;
    private readonly JavaScriptSerializer serializer=new JavaScriptSerializer();
    private FormBorderStyle normalBorder;
    [DllImport("dwmapi.dll")] private static extern int DwmSetWindowAttribute(IntPtr handle, int attr, ref int value, int size);
    [DllImport("user32.dll")] private static extern bool ReleaseCapture();
    [DllImport("user32.dll")] private static extern IntPtr SendMessage(IntPtr hWnd,int msg,int wParam,int lParam);

    internal GardenWindow() {
      Text = "Mooncat · 月球小花园";
      ClientSize = new Size(350,440);
      MinimumSize = new Size(300,360);
      FormBorderStyle=FormBorderStyle.None;
      StartPosition = FormStartPosition.Manual;
      ShowInTaskbar=false;
      TopMost=true;
      BackColor = Color.FromArgb(14,24,28);
      ForeColor = Color.FromArgb(240,234,217);
      AutoScaleMode = AutoScaleMode.Dpi;
      AutoScaleDimensions=new SizeF(96,96);
      KeyPreview = true;
      try { using(var s = Program.ThisAssembly.GetManifestResourceStream("Mooncat.icon.ico")) Icon = new Icon(s); } catch {}
      ReadWindowSettings();
      PositionWidget();
      if (Program.IsRuntimeTest) { Location=new Point(-32000,-32000); TopMost=false; }
      loading = new Label { Text="月白正在打开小花园…", Dock=DockStyle.Fill, TextAlign=ContentAlignment.MiddleCenter, Font=new Font("Microsoft YaHei UI",10), BackColor=BackColor, ForeColor=ForeColor };
      Controls.Add(loading);
      view = new WebView2 { Dock=DockStyle.Fill, DefaultBackgroundColor=BackColor };
      Controls.Add(view);
      loading.BringToFront();
      Shown += async delegate {
        float startupScale=1; using(var g=CreateGraphics())startupScale=g.DpiX/96f;
        MinimumSize=new Size((int)(300*startupScale),(int)(360*startupScale));
        ClientSize=new Size((int)(350*startupScale),(int)(440*startupScale));
        if(Program.IsRuntimeTest) {
          if(Program.InitialTestMode=="peek")ChangeMode(true,true);
          else if(Program.InitialTestMode=="expanded")ChangeMode(false);
          Location=new Point(-32000,-32000);
        } else PositionWidget();
        if(!Program.IsRuntimeTest)SetRoamingCat(roamingEnabled);
        await InitializeGarden();
      };
      var menu=new ContextMenuStrip();
      menu.Items.Add("显示桌边小花园",null,delegate { ChangeMode(true); ShowGarden(); });
      menu.Items.Add("打开星空观景台",null,delegate { ChangeMode(false); ShowGarden(); });
      menu.Items.Add(new ToolStripSeparator());
      roamingItem=new ToolStripMenuItem("任务栏上的月白") { CheckOnClick=true,Checked=roamingEnabled };
      roamingItem.CheckedChanged+=delegate {SetRoamingCat(roamingItem.Checked);};
      menu.Items.Add(roamingItem);
      menu.Items.Add(new ToolStripSeparator());
      menu.Items.Add("退出 Mooncat",null,delegate { closingForExit=true; Close(); });
      tray=new NotifyIcon { Icon=Icon,Text="Mooncat · 月白的小花园",ContextMenuStrip=menu,Visible=!Program.IsRuntimeTest };
      tray.DoubleClick += delegate { ShowGarden(); };
      if(Program.ShowRequest!=null) {
        var showTimer=new Timer { Interval=400 };
        showTimer.Tick += delegate { if(Program.ShowRequest.WaitOne(0))ShowGarden(); };
        showTimer.Start(); FormClosed += delegate { showTimer.Dispose(); };
      }
      LocationChanged += delegate { if (compact && !changingMode && !Program.IsRuntimeTest && !fullscreen) { widgetPosition=Location; hasWidgetPosition=true; SaveWindowSettings(); } };
      FormClosing += delegate(object sender,FormClosingEventArgs e) {
        if (!closingForExit && !Program.IsRuntimeTest && e.CloseReason==CloseReason.UserClosing) { e.Cancel=true; HideGarden(); return; }
        CancelModeTransition(false);
        if(roamer!=null){roamer.Dispose();roamer=null;}
        SaveWindowSettings(); tray.Visible=false; tray.Dispose(); menu.Dispose();
        if (view != null) view.Dispose();
      };
      if (Program.IsRuntimeTest) {
        var timeout = new Timer { Interval=40000 };
        timeout.Tick += delegate { timeout.Stop(); Program.ReportError(new TimeoutException("Native WebView2 smoke test timed out.")); Close(); };
        timeout.Start();
        FormClosed += delegate { timeout.Dispose(); };
      }
    }

    protected override void OnHandleCreated(EventArgs e) {
      base.OnHandleCreated(e);
      try { int enabled=1; DwmSetWindowAttribute(Handle,20,ref enabled,sizeof(int)); int corner=2; DwmSetWindowAttribute(Handle,33,ref corner,sizeof(int)); } catch {}
    }

    private async Task InitializeGarden() {
      try {
        Trace("Creating local WebView2 environment");
        var options = new CoreWebView2EnvironmentOptions("--autoplay-policy=document-user-activation-required");
        var environment = await CoreWebView2Environment.CreateAsync(null,Path.Combine(Program.Profile,"save-profile"),options);
        Trace("Environment created; creating native control");
        await view.EnsureCoreWebView2Async(environment);
        Trace("Control initialized; configuring offline host");
        var core = view.CoreWebView2;
        core.Settings.AreDevToolsEnabled=false;
        core.Settings.AreDefaultContextMenusEnabled=false;
        core.Settings.IsStatusBarEnabled=false;
        core.Settings.IsZoomControlEnabled=false;
        core.Settings.AreBrowserAcceleratorKeysEnabled=false;
        core.SetVirtualHostNameToFolderMapping("mooncat.local",Program.AssetRoot,CoreWebView2HostResourceAccessKind.DenyCors);
        core.NavigationStarting += delegate(object sender,CoreWebView2NavigationStartingEventArgs e) {
          Uri uri;
          if (!Uri.TryCreate(e.Uri,UriKind.Absolute,out uri) || uri.Host != "mooncat.local" || uri.Scheme != "https") e.Cancel=true;
        };
        core.NewWindowRequested += delegate(object sender,CoreWebView2NewWindowRequestedEventArgs e) { e.Handled=true; };
        core.PermissionRequested += delegate(object sender,CoreWebView2PermissionRequestedEventArgs e) { e.State=CoreWebView2PermissionState.Deny; };
        core.DownloadStarting += delegate(object sender,CoreWebView2DownloadStartingEventArgs e) { e.Cancel=true; };
        core.AddWebResourceRequestedFilter("*",CoreWebView2WebResourceContext.All);
        core.WebResourceRequested += delegate(object sender,CoreWebView2WebResourceRequestedEventArgs e) {
          Uri uri;
          if (Uri.TryCreate(e.Request.Uri,UriKind.Absolute,out uri) && (uri.Scheme=="http" || uri.Scheme=="https") && (uri.Scheme != "https" || uri.Host != "mooncat.local")) e.Response=environment.CreateWebResourceResponse(new MemoryStream(),403,"Offline garden", "Content-Type: text/plain");
        };
        core.ContainsFullScreenElementChanged += delegate { SetFullScreen(core.ContainsFullScreenElement); };
        view.KeyDown += delegate(object sender,KeyEventArgs e) {
          if(e.KeyCode==Keys.F11) { e.Handled=true; e.SuppressKeyPress=true; if(compact)ChangeMode(false); else SetFullScreen(!fullscreen); }
          if(e.KeyCode==Keys.Escape && fullscreen && !core.ContainsFullScreenElement) { e.Handled=true; SetFullScreen(false); }
        };
        await core.AddScriptToExecuteOnDocumentCreatedAsync("window.MOONCAT_DESKTOP=true;window.__nativeErrors=[];addEventListener('error',e=>window.__nativeErrors.push(e.message||'resource error'));addEventListener('unhandledrejection',e=>window.__nativeErrors.push(String(e.reason)));");
        core.WebMessageReceived += HandleHostMessage;
        core.NavigationCompleted += async delegate(object sender,CoreWebView2NavigationCompletedEventArgs e) {
          navigationCount++;
          Trace("Navigation completed: "+e.IsSuccess+" / "+e.WebErrorStatus);
          if (e.IsSuccess) {
            loading.Visible=false; view.Focus(); SendWindowState();
            if (Program.IsRuntimeTest) {
              try {
                await Task.Delay(1500);
                if(Program.TestTransitions)await VerifyTransitions(core);
                if(Program.TestRoamer) {
                  using(var pet=new RoamingCatForm(delegate{},delegate{},delegate{})) {
                    pet.SetPetVisible(true);Trace(pet.VerifyNativeFrames());pet.SetPetVisible(false);
                  }
                }
                if(!String.IsNullOrEmpty(Program.CapturePreviewPath)) {
                  await Task.Delay(350);
                  Directory.CreateDirectory(Path.GetDirectoryName(Program.CapturePreviewPath));
                  using(var capture=new FileStream(Program.CapturePreviewPath,FileMode.Create,FileAccess.Write,FileShare.None))await core.CapturePreviewAsync(CoreWebView2CapturePreviewImageFormat.Png,capture);
                  Trace("Captured owned renderer preview: "+Program.CapturePreviewPath);
                }
                string result = await core.ExecuteScriptAsync(Program.QaScript ?? "JSON.stringify({title:document.title,url:location.href,desktop:window.MOONCAT_DESKTOP,ready:document.readyState,viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,scripts:[...document.scripts].map(x=>x.src),errors:window.__nativeErrors,game:typeof window.MoonGame,body:document.body.innerText.slice(0,800),localStorage:!!window.localStorage})");
                if (String.IsNullOrEmpty(result) || result=="null") throw new InvalidDataException("Native script execution returned no result.");
                File.WriteAllText(Path.Combine(Program.Profile,"runtime-test.log"),"PASS Native offline WebView2 launch\r\n"+result,Encoding.UTF8);
              } catch(Exception ex) { Program.ReportError(ex); }
              Close();
            }
          } else {
            loading.Text="花园没能载入。关闭后重新打开即可。";
            if (Program.IsRuntimeTest) { Program.ReportError(new InvalidOperationException("Local navigation failed: "+e.WebErrorStatus)); Close(); }
          }
        };
        core.ProcessFailed += delegate(object sender,CoreWebView2ProcessFailedEventArgs e) {
          loading.Text="星光休息了一下，请关闭花园后重新打开。"; loading.Visible=true; loading.BringToFront();
        };
        core.Navigate("https://mooncat.local/"+(compact?(petPeek?"widget.html?mode=pet":"widget.html"):"index.html"));
        Trace("Local "+(compact?(petPeek?"pet":"compact"):"expanded")+" navigation dispatched");
      } catch(Exception ex) { loading.Text="花园暂时无法打开。"; Program.ReportError(ex); if(Program.IsRuntimeTest)Close(); }
    }

    private void Trace(string message) {
      if(Program.IsRuntimeTest)File.AppendAllText(Path.Combine(Program.Profile,"runtime-trace.log"),DateTime.UtcNow.ToString("o")+" "+message+"\r\n",Encoding.UTF8);
    }

    private void SetFullScreen(bool enter) {
      if(enter==fullscreen)return;
      fullscreen=enter;
      if(enter) {
        normalBounds=Bounds; normalState=WindowState; normalBorder=FormBorderStyle;
        WindowState=FormWindowState.Normal;
        FormBorderStyle=FormBorderStyle.None;
        Bounds=Screen.FromControl(this).Bounds;
      } else {
        FormBorderStyle=normalBorder;
        Bounds=normalBounds; WindowState=normalState;
      }
    }

    private void HandleHostMessage(object sender,CoreWebView2WebMessageReceivedEventArgs e) {
      Uri source;
      if(!Uri.TryCreate(e.Source,UriKind.Absolute,out source) || source.Scheme!="https" || source.Host!="mooncat.local")return;
      string command=null;
      Dictionary<string,object> payload=null;
      try {
        object parsed=serializer.DeserializeObject(e.WebMessageAsJson);
        var map=parsed as Dictionary<string,object>;
        payload=map;
        if(map!=null && map.ContainsKey("type"))command=Convert.ToString(map["type"]);
        else command=parsed as string;
      } catch { return; }
      switch(command) {
        case "drag": if(!fullscreen){CancelModeTransition(true);ReleaseCapture(); SendMessage(Handle,0x00A1,2,0);} break;
        case "expand": ChangeMode(false); break;
        case "compact": ChangeMode(true); break;
        case "peek": ChangeMode(true,true); break;
        case "ready": SendWindowState(); break;
        case "motion-preference":
          if(payload!=null && payload.ContainsKey("reduced")) {
            bool reduced;
            if(Boolean.TryParse(Convert.ToString(payload["reduced"]),out reduced))reducedMotion=reduced;
            if(reducedMotion && transitioning)CancelModeTransition(true);
          }
          break;
        case "minimize": case "hide": case "close": HideGarden(); break;
        case "pin":
          TopMost=!TopMost;
          if(compact)widgetPinned=TopMost; else observatoryPinned=TopMost;
          SaveWindowSettings(); if(!transitioning)SendWindowState(); break;
        case "toggle-fullscreen": if(compact)ChangeMode(false); else SetFullScreen(!fullscreen); break;
      }
    }

    private void ChangeMode(bool small) { ChangeMode(small,false); }
    private void ChangeMode(bool small,bool petOnly) {
      if(fullscreen)SetFullScreen(false);
      if(compact==small && petPeek==(small && petOnly)) { if(!transitioning)SendWindowState(); return; }
      if(compact && small && view.CoreWebView2!=null) { TransitionWidget(petOnly); return; }
      CancelModeTransition(true);
      changingMode=true;
      try {
        if(compact) { widgetPosition=Location; hasWidgetPosition=true; }
        compact=small;
        petPeek=small && petOnly;
        WindowState=FormWindowState.Normal;
        FormBorderStyle=small ? FormBorderStyle.None : FormBorderStyle.Sizable;
        ShowInTaskbar=!small;
        float scale=1;
        using(var g=CreateGraphics())scale=g.DpiX/96f;
        MinimumSize=small ? (petPeek ? new Size((int)(150*scale),(int)(170*scale)) : new Size((int)(300*scale),(int)(360*scale))) : new Size((int)(960*scale),(int)(640*scale));
        TopMost=small ? widgetPinned : observatoryPinned;
        if(small) { ClientSize=petPeek ? new Size((int)(170*scale),(int)(190*scale)) : new Size((int)(350*scale),(int)(440*scale)); PositionWidget(); }
        else {
          var area=Screen.FromControl(this).WorkingArea;
          ClientSize=new Size(Math.Min((int)(1280*scale),area.Width-40),Math.Min((int)(850*scale),area.Height-60));
          Location=new Point(area.Left+(area.Width-Width)/2,area.Top+(area.Height-Height)/2);
        }
        if(Program.IsRuntimeTest){Location=new Point(-32000,-32000);TopMost=false;}
        if(view.CoreWebView2!=null) { loading.Visible=true; loading.BringToFront(); view.CoreWebView2.Navigate("https://mooncat.local/"+(small?(petPeek?"widget.html?mode=pet":"widget.html"):"index.html")); }
        ShowGarden(); SaveWindowSettings();
      } finally { changingMode=false; }
    }

    private void HideGarden() {
      CancelModeTransition(true); SaveWindowSettings(); Hide();
    }
    private void ShowGarden() {
      if(Program.IsRuntimeTest)return;
      if(compact)PositionWidget();
      Show(); if(WindowState==FormWindowState.Minimized)WindowState=FormWindowState.Normal; Activate();
    }
    private void SendWindowState() {
      if(view.CoreWebView2!=null)view.CoreWebView2.PostWebMessageAsJson(serializer.Serialize(new { type="window-state", compact=compact, pet=petPeek, pinned=TopMost }));
    }

    private void TransitionWidget(bool petOnly) {
      CancelModeTransition(false);
      Rectangle start=Bounds;
      petPeek=petOnly;
      float scale=1; using(var g=CreateGraphics())scale=g.DpiX/96f;
      Size targetSize=petOnly ? new Size((int)(170*scale),(int)(190*scale)) : new Size((int)(350*scale),(int)(440*scale));
      transitionTarget=new Rectangle(start.Right-targetSize.Width,start.Top,targetSize.Width,targetSize.Height);
      MinimumSize=new Size((int)(150*scale),(int)(170*scale));
      changingMode=true; transitioning=true;
      int duration=reducedMotion ? 0 : 320;
      view.CoreWebView2.PostWebMessageAsJson(serializer.Serialize(new { type="mode-transition",pet=petOnly,duration=duration }));
      if(duration==0) { CancelModeTransition(true); return; }
      var watch=System.Diagnostics.Stopwatch.StartNew();
      transitionTimer=new Timer { Interval=16 };
      transitionTimer.Tick += delegate {
        double t=Math.Min(1,watch.Elapsed.TotalMilliseconds/duration);
        double ease=t*t*(3-2*t);
        int width=(int)Math.Round(start.Width+(transitionTarget.Width-start.Width)*ease);
        int height=(int)Math.Round(start.Height+(transitionTarget.Height-start.Height)*ease);
        Bounds=new Rectangle(start.Right-width,start.Top,width,height);
        if(t>=1)CancelModeTransition(true);
      };
      transitionTimer.Start();
    }

    private void CancelModeTransition(bool settle) {
      if(transitionTimer!=null) { transitionTimer.Stop(); transitionTimer.Dispose(); transitionTimer=null; }
      if(!transitioning)return;
      if(settle) {
        Bounds=transitionTarget;
        float scale=1; using(var g=CreateGraphics())scale=g.DpiX/96f;
        MinimumSize=petPeek ? new Size((int)(150*scale),(int)(170*scale)) : new Size((int)(300*scale),(int)(360*scale));
      }
      transitioning=false; changingMode=false;
      widgetPosition=Location; hasWidgetPosition=true;
      if(settle){SendWindowState();SaveWindowSettings();}
    }

    private async Task VerifyTransitions(CoreWebView2 core) {
      int navigations=navigationCount;
      Rectangle start=Bounds;
      await core.ExecuteScriptAsync("window.__nativeIdentity='retained';window.chrome.webview.postMessage({type:'peek'});");
      await Task.Delay(150);
      Rectangle middle=Bounds;
      await Task.Delay(400);
      if(!petPeek || transitioning || Bounds.Right!=start.Right || Bounds.Top!=start.Top || navigationCount!=navigations)throw new InvalidDataException("Compact-to-pet native transition failed.");
      string petClass=await core.ExecuteScriptAsync("document.body.classList.contains('pet-mode')");
      if(petClass!="true")throw new InvalidDataException("The native cat transition did not update the widget page.");
      if(!reducedMotion && (middle.Width==start.Width || middle.Width==Bounds.Width))throw new InvalidDataException("Native transition did not interpolate its window size.");
      Trace("PASS animated compact-to-pet; anchored right/top; native midpoint width="+middle.Width);
      await core.ExecuteScriptAsync("window.chrome.webview.postMessage({type:'compact'});");
      await Task.Delay(550);
      if(petPeek || transitioning || navigationCount!=navigations || Bounds.Size!=start.Size)throw new InvalidDataException("Pet-to-compact native transition failed.");
      string compactClass=await core.ExecuteScriptAsync("document.body.classList.contains('pet-mode')");
      if(compactClass!="false")throw new InvalidDataException("The native garden transition did not update the widget page.");
      string identity=await core.ExecuteScriptAsync("window.__nativeIdentity");
      if(identity!="\"retained\"")throw new InvalidDataException("Widget page was reloaded during a size transition.");
      Trace("PASS pet-to-compact; same page and running JavaScript retained");
      await core.ExecuteScriptAsync("window.chrome.webview.postMessage({type:'peek'});");
      await Task.Delay(90);
      await core.ExecuteScriptAsync("window.chrome.webview.postMessage({type:'compact'});");
      await Task.Delay(550);
      if(petPeek || transitioning || navigationCount!=navigations || Bounds.Size!=start.Size)throw new InvalidDataException("Rapid native transition retargeting failed.");
      Trace("PASS rapid reverse transition; latest requested mode wins");
      await core.ExecuteScriptAsync("window.chrome.webview.postMessage({type:'motion-preference',reduced:true});window.chrome.webview.postMessage({type:'peek'});");
      await Task.Delay(100);
      if(!petPeek || transitioning)throw new InvalidDataException("Reduced-motion native transition failed.");
      await core.ExecuteScriptAsync("window.chrome.webview.postMessage({type:'compact'});");
      await Task.Delay(100);
      if(petPeek || transitioning || Bounds.Size!=start.Size)throw new InvalidDataException("Reduced-motion return failed.");
      Trace("PASS reduced-motion transitions, original compact size restored");
    }
    private void PositionWidget() {
      var area=hasWidgetPosition ? Screen.FromPoint(widgetPosition).WorkingArea : Screen.PrimaryScreen.WorkingArea;
      int x=hasWidgetPosition?widgetPosition.X:area.Right-Width-24;
      int y=hasWidgetPosition?widgetPosition.Y:area.Top+24;
      Location=new Point(Math.Max(area.Left,Math.Min(x,area.Right-Width)),Math.Max(area.Top,Math.Min(y,area.Bottom-Height)));
    }
    private void SetRoamingCat(bool enabled) {
      roamingEnabled=enabled;
      if(roamingItem!=null && roamingItem.Checked!=enabled){roamingItem.Checked=enabled;return;}
      if(Program.IsRuntimeTest)return;
      if(enabled && roamer==null) {
        try {roamer=new RoamingCatForm(delegate {ChangeMode(true);ShowGarden();},delegate {SetRoamingCat(false);},delegate {closingForExit=true;Close();});}
        catch(Exception ex) {roamingEnabled=false;if(roamingItem!=null)roamingItem.Checked=false;Program.ReportError(ex);return;}
      }
      if(roamer!=null)roamer.SetPetVisible(enabled);
      SaveWindowSettings();
    }
    private void ReadWindowSettings() {
      try {
        string file=Path.Combine(Program.Profile,"desktop-window.json");
        if(!File.Exists(file))return;
        var state=serializer.Deserialize<Dictionary<string,object>>(File.ReadAllText(file,Encoding.UTF8));
        if(state.ContainsKey("x") && state.ContainsKey("y")) { widgetPosition=new Point(Convert.ToInt32(state["x"]),Convert.ToInt32(state["y"]));hasWidgetPosition=true; }
        if(state.ContainsKey("widgetPinned"))widgetPinned=Convert.ToBoolean(state["widgetPinned"]);
        if(state.ContainsKey("observatoryPinned"))observatoryPinned=Convert.ToBoolean(state["observatoryPinned"]);
        if(state.ContainsKey("roamingCat"))roamingEnabled=Convert.ToBoolean(state["roamingCat"]);
        TopMost=widgetPinned;
      } catch {}
    }
    private void SaveWindowSettings() {
      if(Program.IsRuntimeTest)return;
      try { File.WriteAllText(Path.Combine(Program.Profile,"desktop-window.json"),serializer.Serialize(new { x=hasWidgetPosition?widgetPosition.X:Location.X,y=hasWidgetPosition?widgetPosition.Y:Location.Y,widgetPinned=widgetPinned,observatoryPinned=observatoryPinned,roamingCat=roamingEnabled }),Encoding.UTF8); } catch {}
    }
  }
}
