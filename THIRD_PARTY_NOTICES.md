# Third-party notices

The repository MIT license applies to original Mooncat code, illustrations,
animation source and the synthesized music implementation. The following
third-party items retain their own licenses.

## Cat recording — CC0 1.0

- File: `app/assets/meow.mp3`
- Recording: **Cat Meow** by **qubodup**, derived from **Cat Call (Meow)** by **Jofae**.
- Source: <https://freesound.org/people/qubodup/sounds/813119/>
- Bundled preview: <https://cdn.freesound.org/previews/813/813119_71257-hq.mp3>
- License: Creative Commons Zero, CC0 1.0 Universal.
- License text: <https://creativecommons.org/publicdomain/zero/1.0/legalcode>

The source page identifies the recording as CC0, mono, 0.455 seconds. Mooncat
adds a gentle playback fade and small pitch variations. Attribution is retained
as a courtesy. No third-party music samples are bundled.

## Microsoft WebView2 SDK — Microsoft terms

The Windows build downloads `Microsoft.Web.WebView2` version `1.0.4258.31`
from official NuGet and verifies its SHA256:

```text
56F7F4B8BF9AEE4B8EFEFBBDD4F67D5F74EBD1B100ED0806DA71BF76AF481AA9
```

Source package: <https://www.nuget.org/packages/Microsoft.Web.WebView2/1.0.4258.31>

The package's `LICENSE.txt` and `NOTICE.txt` remain authoritative. The build
embeds these notices with the Core and WinForms assemblies and x64 native
loader, then extracts them alongside those files at runtime. These components
are not relicensed under MIT. SDK binaries and the downloaded package are
excluded from the source repository.

The Evergreen Runtime is a separate Microsoft prerequisite, obtained from
Microsoft: <https://learn.microsoft.com/microsoft-edge/webview2/concepts/distribution>.

## Optional artwork development dependency

`sharp` version `0.35.5` is used only to rasterize the checked-in original SVG
illustrations. It is not required by the running Windows application and is not
bundled into the EXE.

- Project: <https://github.com/lovell/sharp>
- License: Apache-2.0.
- Dependencies, including libvips and platform packages, retain their own licenses.

Install the package using npm to obtain its complete dependency notices.
