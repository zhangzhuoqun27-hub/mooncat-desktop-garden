# Mooncat · Winesun的小花园

> 当前版本：**v0.2.1** · Windows 10/11 x64。

一只戴着围巾的小猫，一座会自己长大的月球花园。

Mooncat 是 Windows 桌面陪伴程序：小猫可以沿着任务栏上方散步，花园可以安静地待在屏幕边缘。工作时交给Winesun照料花田，有空时再种花、摸猫、听一点舒缓的音乐。

**[下载 v0.2.1 Windows 版 · Mooncat.exe](https://github.com/zhangzhuoqun27-hub/mooncat-desktop-garden/releases/download/v0.2.1/Mooncat.exe)**

[查看 v0.2.1 发行页与校验和](https://github.com/zhangzhuoqun27-hub/mooncat-desktop-garden/releases/tag/v0.2.1)

下载后双击 `Mooncat.exe` 即可运行，无需打开 HTML 或启动浏览器。普通使用者不必下载源代码或自行构建。

![Winesun和月亮](app/assets/mooncat-art.png)

## 可以做什么

- **全屏观景站**：启动进入完整星空，音乐低声淡入；可以召唤流星、写心愿。启动和“返航”后的主页保持没有任务栏桌宠。
- **主页经营**：点主场景上的“月球小花园”，在原主页打开大经营窗口，打理同一份花园存档。
- **桌边花园与小猫**：点“出趟远门”，约 350 × 440 逻辑像素的侧边花园和任务栏小猫同时出现；花园可以拖动、置顶。“返航”回到完整星空并收起任务栏桌宠。
- **任务栏散步**：原生猫咪窗口不抢键盘焦点；短腿和前后对角交替步态，让 Winesun 轻轻走动、眨眼、甩尾、停下来休息。可以拖起猫咪，松手后落回任务栏并轻轻弹跳，右键可以暂停。
- **随时找回来**：花园保留一个最小化入口。最小化或关闭窗口后，任务栏上的 Mooncat 应用按钮保留，小猫继续陪伴；点击任务栏按钮或双击任务栏猫咪即可恢复花园。花园窗口直接显示或收起，不再播放猫与花园之间的变形动画。
- **慢慢种花**：六块花田种月光花、晚梦铃、桃星花、雨露盏、小暖阳和月眠兰；基础花期 8–100 分钟，收获净收益 1–3 星光。天气、补水、花瓣和品种记录各有小变化，也可以交给 Winesun 托管。
- **花园小物**：月光长椅、暖星灯、小蘑菇屋、叶子风铃、小鸟饮水台、花园信箱和藤叶小拱门，共七种摆件。积累花瓣与花种记录，再花费星光和花瓣安放到月岛；也可以喂 Winesun 小鱼干。
- **留一份祝福**：新种花的净收益每累计 100 星光，将当时余额的 20% 化成一次祝福并永久记下次数；旧零钱、旧花迁移收益和猫咪礼物不计入新祝福进度。
- **三首夜间配乐**：晚安月球、蓝色梦境、玫瑰星云分别播放原创的“月球晚安曲”“蓝色潮汐”“玫瑰小圆舞曲”，换夜空时交叉淡入淡出。桌边陪伴和最小化时音乐继续播放，可以随时暂停或静音；点击猫咪有本地猫叫，种花与收获也有轻柔反馈。

花田、叶片、星光和小猫都有细微的运动。程序遵循系统减少动态效果的偏好。

## 使用

在 Windows 10/11 x64 上运行构建产物 `Mooncat.exe`。无需启动服务器，也不会打开外部浏览器。运行时需要 .NET Framework 4.8 和 Microsoft WebView2 Evergreen Runtime；多数 Windows 电脑已经具备这些组件。

如果程序提示缺少 WebView2，可以从 [Microsoft 官方页面](https://developer.microsoft.com/microsoft-edge/webview2/) 安装 Evergreen Runtime。

程序关闭按钮会最小化到任务栏，Mooncat 应用按钮一直保留，点击即可恢复。系统托盘也提供辅助入口；完整退出请使用托盘或小猫右键菜单里的退出。首次运行不注册开机启动。

## 从源码构建

在 Windows PowerShell 中，从仓库根目录运行：

```powershell
& .\desktop\install-sdk.ps1
& .\desktop\build.ps1 -OutputPath .\dist\Mooncat.exe
```

SDK 安装脚本从官方 NuGet 下载固定版本 `Microsoft.Web.WebView2 1.0.4258.31`，验证包 SHA256 和 Microsoft 原生加载器签名。构建使用 Windows 自带的 .NET Framework C# 编译器，把页面、音乐实现、插画和 SDK 可分发组件嵌入同一个 EXE。

已经提交绘制好的 PNG 和 SVG，因此正常 EXE 构建不需要 Node.js。若要重新生成原创插画和八帧猫咪行走图：

```powershell
npm install
npm run art
```

美术脚本只使用 `sharp`，固定版本见 `package.json`。完整编译步骤、测试命令和原生消息接口见 [desktop/BUILD.md](desktop/BUILD.md)。

## 经济回归验证

维护者只需 Node.js，任选一条命令即可验证花种价格与产出、在线和离线托管、操作前旧账结算、净收益与祝福规则：

```powershell
node .\tests\economy.test.cjs
# 或
npm test
```

当前版本的 32 项经济回归验证已通过。测试只用 Node 标准库和独立的内存存档环境，不读取或写入本机真实存档；无需为经济测试安装 `sharp` 或执行 `npm install`。正常使用 EXE 也不需要 Node.js。

## 项目结构

```text
app/                         离线页面、花园、音乐及原创素材
desktop/Mooncat.cs           WinForms 窗口、托盘、WebView2 离线宿主
desktop/RoamingCat.cs        GDI+ 透明桌宠和任务栏上方移动
desktop/build.ps1            构建单文件 EXE
desktop/install-sdk.ps1      下载并校验固定版本 SDK
scripts/draw-mooncat.cjs     原创插画和行走帧的可编辑源文件
tests/economy.test.cjs       不访问真实存档的经济回归验证
.github/workflows/           Windows 构建、校验和及 tag 发布
```

界面在离线 WebView2 中渲染，桌宠本身是独立的原生透明窗口。原生宿主只接收可信的 `https://mooncat.local` 页面消息，并阻止其他域名的网络请求。宿主没有向页面开放 shell、任意文件访问或执行命令的接口。

## 保存与后续更新

存档只留在这台电脑，位置为 `%LOCALAPPDATA%\Mooncat\MoonGarden`。花园、心愿与声音偏好保存在 `save-profile`；窗口位置、置顶与桌宠偏好保存在 `desktop-window.json`。更新 EXE 时，新素材提取到新的哈希目录，继续使用原有存档和离线站点地址。v0.2 迁移保留旧零钱、已购摆件和花田成长进度，并新增花瓣、品种与祝福记录。

当前版本使用手动更新：退出旧版、运行新版，继续使用原有存档。仓库没有自动下载器。后续改动请更新 [CHANGELOG.md](CHANGELOG.md)，在本地验证后提交。GitHub Actions 运行经济回归并生成 Windows 构建产物，正式版本通过 Release 提供 EXE 和校验和；发行流程见 [.github/workflows/windows.yml](.github/workflows/windows.yml)。已发布版本的附件不会被后续构建自动覆盖。

## 参与改进

欢迎通过 Issue 提交建议，通过 Pull Request 改进动效、花园玩法、音频或 Windows 体验。提交前请先验证源码可编译；修改原生交互时，使用隔离测试存档执行 smoke test，不要覆盖日常存档。新增素材请注明来源和许可证。

## 许可

原创程序代码、矢量插画、行走动画与音乐实现采用 [MIT](LICENSE)。猫叫录音采用 CC0；Microsoft WebView2 组件保留 Microsoft 的许可，详见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。项目没有使用《星露谷物语》的代码、角色、素材或音乐。

首个公开版本为 `v0.1.0`；本版未进行代码签名。CI 固定 SDK 和 Actions 版本、公开 SHA256，提供可复现的构建流程；由于编译器和 ZIP 时间戳，独立构建的 EXE 不保证逐字节相同。
