# Mooncat Windows desktop host

This is a Windows x64 desktop host for the original offline Mooncat garden. The output is one executable with its HTML/CSS/JavaScript, artwork, audio and Microsoft WebView2 SDK redistributables embedded. The executable does not start a web server or open an external browser.

The current source builds **Mooncat v0.2.2** for Windows x64, released on **2026-10-16**. The [v0.2.2 Release](https://github.com/zhangzhuoqun27-hub/mooncat-desktop-garden/releases/tag/v0.2.2) provides the [single executable](https://github.com/zhangzhuoqun27-hub/mooncat-desktop-garden/releases/download/v0.2.2/Mooncat.exe), [Windows ZIP](https://github.com/zhangzhuoqun27-hub/mooncat-desktop-garden/releases/download/v0.2.2/Mooncat-v0.2.2-Windows-x64.zip), and checksums.

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

The default is the fullscreen observatory, with the opening music fading in and no native taskbar cat. “月球小花园” opens a large management dialog within the same home page and operates on the shared save. “出趟远门” opens the 350 × 440 logical-pixel garden together with Winesun's independent native transparent taskbar window. “返航” returns to the fullscreen scene and hides the native cat.

Winesun's short legs alternate in diagonal pairs. The cat can be dragged, then falls to the taskbar with a small elastic landing. It does not take keyboard focus while walking. Cat-to-garden morph animations have been removed; showing, minimizing and restoring the garden changes visibility directly.

The garden presents one minimize button, and the application's taskbar button remains present. `hide`, `close`, and `minimize` minimize the main window. During desktop accompaniment, the taskbar cat remains visible while the garden is minimized; clicking the application taskbar button or double-clicking the cat restores the garden beside it. The tray remains an auxiliary way to open the home or garden and to exit. There is no automatic startup registration. F11 toggles fullscreen; Escape first closes an open home dialog, then exits fullscreen when no dialog is open.

The garden uses `widget.html`; the observatory uses `index.html`. Home management loads the garden into its dialog without navigating to the desktop widget. Returning between home and widget restores saved music preferences and playback positions. Native background music remains enabled while the main window is minimized.

Normal updates retain user data. Exit the running program, replace the EXE and launch the new version; it continues using the same profile and offline origin, preserving the garden, wishes and audio preferences. Updating does not automatically reset progress.

In v0.2.2, newly planted flowers retain their seed costs and base growth times, with gross harvest rewards of 3, 5, 8, 12, 18 and 26 stars. Net returns after seed costs are 1, 2, 4, 8, 13 and 20 stars, before any blessing transfer. Existing flowers keep their original harvest quotes, and offline activity before the upgrade is settled at the old rates. See the [flower table in the README](../README.md#v022-花田回报).

## Isolated verification

Run the 46 economic regression checks using Node.js; this uses only standard libraries and an isolated in-memory save, and requires neither `npm install` nor a native runtime:

```powershell
node .\tests\economy.test.cjs
```

These options are intended for development. Always supply an absolute workspace profile so tests do not touch a user's real save:

```powershell
& .\dist\Mooncat.exe --self-test --test-profile C:\path\to\test-profile
& .\dist\Mooncat.exe --smoke-test --test-profile C:\path\to\test-profile
& .\dist\Mooncat.exe --smoke-test --test-mode compact --test-profile C:\path\to\test-profile
& .\dist\Mooncat.exe --smoke-test --test-mode peek --test-profile C:\path\to\test-profile
& .\dist\Mooncat.exe --smoke-test --test-mode expanded --test-profile C:\path\to\test-profile
& .\dist\Mooncat.exe --smoke-test --transition-test --roamer-test --test-profile C:\path\to\test-profile
```

Resource self-test checks the embedded SHA256, safe ZIP paths, extracted files, widget/script references, sprite grid and installed runtime. Native smoke tests use a window outside the screen, run the actual WebView2 renderer, record JavaScript errors and viewport dimensions, then exit. Expanded-mode smoke testing also verifies that the startup AudioContext advances without interaction. Mode tests exercise a home without the taskbar cat, garden-and-cat coexistence, minimization with the taskbar button retained, restoration and fullscreen return. Roamer tests render all eight frames through Windows per-pixel-alpha `UpdateLayeredWindow` and verify taskbar alignment, gravity and elastic landing.

Results are written inside the supplied profile as `self-test.log`, `runtime-test.log`, `runtime-trace.log`, or `last-error.log`. The GUI executable's process exit code is 0 on success. Some restricted execution sandboxes prevent WebView2 subprocess initialization; native testing needs normal local execution permissions.

Add `--capture-preview C:\path\to\preview.png` to a smoke test to capture the application's own WebView2 renderer into a PNG. This does not capture the screen, other windows or other applications.

## Native bridge

Only messages from the exact trusted `https://mooncat.local` origin are accepted. The app blocks HTTP(S) resource requests to other hosts and external navigation. Messages use `window.chrome.webview.postMessage({type: '...'})`.

Supported types: `ready`, `drag`, `compact` (garden and cat), `expand` (observatory without native cat), `pin`, `hide`, `minimize`, `close`, `toggle-fullscreen`, and `motion-preference` with a Boolean `reduced` value. The legacy `peek` message remains accepted by the host, but the garden exposes only one minimize button. The host sends `window-state` with mode names `expanded`, `garden`, `cat`, plus `compact`, `pet`, `pinned`, `fullscreen`, `minimized`, `catVisible`, `transitioning`, `startup`, `autoplay` and `musicResumeAllowed`. Mode changes no longer emit a morph animation. The native bridge grants no filesystem, shell, arbitrary URL or execution interface.

## Licensing and publishing

The original application and native source follow the repository's chosen project license. Microsoft WebView2 SDK redistributables retain Microsoft's terms; their `LICENSE.txt` and `NOTICE.txt` are embedded in the EXE and extracted alongside the SDK. Obtain them using the official package installer rather than relicensing them. See <https://www.nuget.org/packages/Microsoft.Web.WebView2/1.0.4258.31>.

For public source, include `Mooncat.cs`, `RoamingCat.cs`, `app.manifest`, `build.ps1`, `make-icon.ps1`, `install-sdk.ps1`, this document, and the original app assets. Do not commit private profiles, logs, cached SDK binaries, package downloads or generated test executables. The generated application is unsigned unless a maintainer signs it using their own Windows code-signing certificate.
