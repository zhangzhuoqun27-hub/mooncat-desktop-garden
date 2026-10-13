# Mooncat Windows desktop host

This is a Windows x64 desktop host for the original offline Mooncat garden. The output is one executable with its HTML/CSS/JavaScript, artwork, audio and Microsoft WebView2 SDK redistributables embedded. The executable does not start a web server or open an external browser.

## Build on Windows

Requirements: Windows 10/11 x64, .NET Framework 4.8, PowerShell, and `curl.exe` (included with current Windows). The build uses the framework's C# compiler at `C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe`; Visual Studio, Node.js and an SDK-wide installation are not needed.

From the repository root, adjust the asset directory to its checked-in location:

```powershell
& .\desktop\install-sdk.ps1
& .\desktop\build.ps1 -AssetDirectory .\app -OutputPath .\dist\Mooncat.exe
```

`install-sdk.ps1` downloads the pinned **Microsoft.Web.WebView2 1.0.4258.31** package from the official NuGet service, checks its SHA256, and verifies the native Microsoft loader's Authenticode signature. `build.ps1` creates an original multi-resolution cat icon, compresses the application assets, embeds the archive and dependencies, and compiles an x64 Windows executable.

Required assets include `index.html`, `game.js`, `audio.js`, `app.js`, `widget.html`, `widget.css`, `widget.js`, `assets/meow.mp3`, and `assets/cat-walk.png`. The native cat sheet contains 8 equal frames in a **4-column × 2-row** grid. A 1024 × 512 sheet gives 256 × 256 frames. The sheet must have transparent pixels surrounding each cat and face right in its reference orientation. Other asset files referenced by the app are bundled automatically.

## Runtime and local data

The Microsoft **WebView2 Evergreen Runtime** and .NET Framework 4.8 must be installed on the target computer. Both were present on the development computer. The app reports a clear message when WebView2 is missing; it does not silently install software or change system settings. Official runtime distribution information: <https://learn.microsoft.com/microsoft-edge/webview2/concepts/distribution>.

First launch extracts versioned assets and SDK files into `%LOCALAPPDATA%\Mooncat\MoonGarden`. Garden progress, wishes and audio preferences live in the persistent `save-profile` WebView2 folder. Native position/pin/cat preferences live in `desktop-window.json`. Asset updates use an archive-hash directory and retain the same `https://mooncat.local` origin and save profile. No data deletion or reset occurs during updates.

The default is a 350 × 440 logical-pixel garden near the screen edge. The original cat also walks above the taskbar without taking keyboard focus. The tray can show the garden, open the full scene, toggle the roaming cat or exit. Closing the garden hides it to the tray. Double-clicking the roaming cat shows the garden; its right-click menu offers pause, show, hide and exit. There is no automatic startup registration.

Compact garden and 170 × 190 cat modes use one live widget page. Native bounds interpolate for 320 ms while the page crossfades. The current right/top edge stays fixed. Rapid reverse requests use the current bounds, and reduced-motion preferences remove the animation. Expanding to the observatory navigates to the full offline page.

## Isolated verification

These options are intended for development. Always supply an absolute workspace profile so tests do not touch a user's real save:

```powershell
& .\dist\Mooncat.exe --self-test --test-profile C:\path\to\test-profile
& .\dist\Mooncat.exe --smoke-test --test-profile C:\path\to\test-profile
& .\dist\Mooncat.exe --smoke-test --test-mode peek --test-profile C:\path\to\test-profile
& .\dist\Mooncat.exe --smoke-test --test-mode expanded --test-profile C:\path\to\test-profile
& .\dist\Mooncat.exe --smoke-test --transition-test --roamer-test --test-profile C:\path\to\test-profile
```

Resource self-test checks the embedded SHA256, safe ZIP paths, extracted files, widget/script references, sprite grid and installed runtime. Native smoke tests use a window outside the screen, run the actual WebView2 renderer, record JavaScript errors and viewport dimensions, then exit. Transition tests exercise native host messages, interpolated window sizes, rapid reversal, reduced motion and retention of the same JavaScript document. Roamer tests render all eight frames through Windows per-pixel-alpha `UpdateLayeredWindow`.

Results are written inside the supplied profile as `self-test.log`, `runtime-test.log`, `runtime-trace.log`, or `last-error.log`. The GUI executable's process exit code is 0 on success. Some restricted execution sandboxes prevent WebView2 subprocess initialization; native testing needs normal local execution permissions.

Add `--capture-preview C:\path\to\preview.png` to a smoke test to capture the application's own WebView2 renderer into a PNG. This does not capture the screen, other windows or other applications.

## Native bridge

Only messages from the exact trusted `https://mooncat.local` origin are accepted. The app blocks HTTP(S) resource requests to other hosts and external navigation. Messages use `window.chrome.webview.postMessage({type: '...'})`.

Supported types: `ready`, `drag`, `peek`, `compact`, `expand`, `pin`, `hide`, `minimize`, `close`, `toggle-fullscreen`, and `motion-preference` with a Boolean `reduced` value. The host sends `mode-transition` (`pet`, `duration`) and `window-state` (`compact`, `pet`, `pinned`). The native bridge grants no filesystem, shell, arbitrary URL or execution interface.

## Licensing and publishing

The original application and native source follow the repository's chosen project license. Microsoft WebView2 SDK redistributables retain Microsoft's terms; their `LICENSE.txt` and `NOTICE.txt` are embedded in the EXE and extracted alongside the SDK. Obtain them using the official package installer rather than relicensing them. See <https://www.nuget.org/packages/Microsoft.Web.WebView2/1.0.4258.31>.

For public source, include `Mooncat.cs`, `RoamingCat.cs`, `app.manifest`, `build.ps1`, `make-icon.ps1`, `install-sdk.ps1`, this document, and the original app assets. Do not commit private profiles, logs, cached SDK binaries, package downloads or generated test executables. The generated application is unsigned unless a maintainer signs it using their own Windows code-signing certificate.
