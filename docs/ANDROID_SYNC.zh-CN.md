# Android 离线复习与设备同步

`0.3.0-alpha.9` 支持一台 PC 配对一台 Android 手机。首次同步后，即使 PC
关机，手机仍可离线复习文字、图片和音频；复习事件保存在加密 outbox 中，并通过
首个安全可用的通道上传。

Android 客户端最低要求 Android 7.0 / API 24。Capacitor 8 已不再支持计划草案中
的 API 23。应用 ID 为 `io.github.yaqxuan.contextvocabularynotebook`。

## 安装 APK

普通安装请从
[GitHub Releases](https://github.com/yaqxuan/context-vocabulary-notebook/releases)
下载签名 APK 和同名 `.sha256` 文件。只有开发测试时才打开对应的 **Android APK**
工作流运行页面，滚动到 **Artifacts**，下载 `cvn-android-...` 并解压。里面有两个文件：

- `app-debug.apk`：Android 安装包，需要发送到手机的是这个文件；
- `app-debug.apk.sha256`：预期校验值，只需留在电脑上用于验证。

发送到手机前，在该目录打开 Windows PowerShell 并校验：

```powershell
$expected = (Get-Content .\app-debug.apk.sha256).Split()[0].ToLowerInvariant()
$actual = (Get-FileHash .\app-debug.apk -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actual -ne $expected) { throw "APK checksum mismatch" }
```

两者一致后，只把 `app-debug.apk` 通过 USB、快速分享或其他文件传输方式发到手机，
在手机上点开安装。如果 Android 提示权限，请只允许当前文件管理器“安装未知应用”，
安装完成后可以再次关闭这项权限。Debug APK 是测试构建，系统可能额外显示风险提示；
校验值不一致时不要安装。

替换旧测试版前，请先同步到 **待上传为 0**。如果 Android 提示签名不兼容，需要卸载
旧 Debug APK 后再安装新版；卸载会删除手机本地副本，因此必须先确认 outbox 已清空。

PR 和缺少签名材料的 tag 构建只会产生短期 Debug artifact，不会创建公开 Release。

发布工作流只从 GitHub Actions secrets 读取以下材料，仓库和 artifact 都不保存：

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

## 启用 PC 同步服务

一键安装脚本会在没有明确配置时自动加入：

```env
CVN_DEVICE_SYNC=1
```

普通网页和 API 继续只监听 localhost。设备同步使用独立、受限的 `/v1` 服务，不会
暴露卡片编辑、AI 配置、API Key、导入导出和普通媒体 API。

打开 **设置 → Android 离线同步**，点击 **自动设置手机同步**。应用会立即启动
局域网 HTTPS、检查防火墙并尝试配置 Tailscale Serve；需要修改 Windows 防火墙时
才会显示管理员确认。首次配对会在默认的
`data/sync-identity/` 生成长期 P-256 PC 身份和自签名证书。不要把身份目录复制到
另一台 PC；身份丢失或轮换后需要重新配对。

## 局域网模式

1. 在 PC 设置中点击 **自动设置手机同步**，不需要重启应用。
2. 在 Windows 管理员确认中只允许 TCP `3109` 入站。
3. 创建五分钟有效的紧凑配对二维码。
4. Android 扫码后，在 PC 确认显示的设备名称；扫码不可用时可把二维码下方的
   **配对文本**直接复制到手机，不需要第三方二维码解析服务。
5. 手机保持 **自动连接**，排障时也可强制选择 **局域网**。

PC 通过 `_cvn-sync._tcp.local` 发布 mDNS。广播只用于寻找地址，Android 始终校验
已保存的完整 SHA-256 SPKI 指纹。mDNS 不可用时使用二维码保存的地址或手动地址。
IP 改变不用重新配对；证书身份改变才需要。

配对二维码的局域网地址会排除 Tailnet 和无法直接使用的链路本地地址。如果 PC
同时存在多个私有网卡地址，Android 会并行验证二维码中的全部 LAN 地址，并保存
真正连通到配对 PC 的地址。因此普通局域网配对不要求安装或开启 Tailscale。

Android 13 及以上版本首次进行局域网发现时，请允许 **附近设备** 权限。Tailscale
模式不使用 mDNS。当前 target SDK 36 在 Android 16 仍默认获得局域网访问；清单声明
和运行时提示也覆盖 Android 16 的可选限制测试。

防火墙示例（请按自己的网段、配置文件和网卡缩小范围）：

```powershell
New-NetFirewallRule -DisplayName "CVN device sync" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3109 -Profile Private
```

```bash
sudo ufw allow from 192.168.0.0/16 to any port 3109 proto tcp
```

macOS 在系统防火墙提示时允许 Node.js 应用。任何平台都不要关闭整套防火墙。

### Windows 11 WSL

正式支持 mirrored 网络，因为它提供局域网直达和 multicast。设置页会检测当前模式，
显示精确的 Hyper-V 防火墙规则，并在用户明确点击后请求 Windows 管理员确认。Microsoft 官方说明见
[WSL 网络应用访问](https://learn.microsoft.com/zh-cn/windows/wsl/networking)。

NAT 模式不承诺 mDNS 与直接连接。向导可以备份并把 `.wslconfig` 合并为
`networkingMode=mirrored`；随后关闭应用，在 PowerShell 执行一次 `wsl --shutdown`。
应用不会创建容易失效的 `portproxy`，也不会自动关闭 WSL。

## Tailscale 模式

设置向导会检查 Linux CLI、Windows PATH、常见安装目录和正在运行的 Tailscale
程序目录，并尝试运行：

```bash
tailscale serve --bg 3108
```

首次使用 Serve 仍可能需要在 Tailscale 官方页面确认 HTTPS 权限；返回设置页继续检查
后会验证并保存 MagicDNS 地址。不要启用 Funnel。Android 默认使用 **自动连接**，
安全验证局域网和 Tailscale；设置中仍保留两种强制模式。认证、撤销、协议和已保存的
PC 身份错误不会通过换通道绕过。

## 同步语义

每次同步依次检查协议和最低客户端版本、上传连续复习事件、上传幂等的收藏/熟记操作、
由 PC 重放受影响卡片、原子替换手机文本快照、
用 Range 补齐并校验图片/音频/视频哈希，最后确认修订。视频保存在应用私有的哈希缓存
中，在选择评分并显示答案后播放；当语境只有视频而没有独立音频时，PC 还会生成一个
较小的 AAC 备用音轨。

选择评分并显示答案后，收藏/取消收藏和 **标记熟记** 也能离线操作。先选 Good 后改
Again 会记录 Again 并进入下一张；首次选择 Again 仍会停留显示答案，确认后才进入
下一张。Again 卡片冷却 10 分钟后才会重新进入电脑和手机队列；没有其他卡片时会显示
下次可复习时间。标记熟记会在同一手机事务中记录当前评分、移出活动复习队列并加入待上传操作。

手机在启动、回到前台或点击 **立即同步** 时同步；“立即同步”会上传离线复习和卡片
操作、刷新 PC 规范快照并下载缺少的媒体，不注册 Android 后台任务。切换
局域网/Tailscale 不会创建新设备，也不会重置两个 outbox、快照修订或媒体缓存。

首次配对必须完整下载 PC 快照，之后才会开放复习和学习语言选择。手机默认跟随 PC
学习语言，也可以在已有活动卡片的语言中离线切换；手机选择会跨重启保存，但不会修改
PC 设置。所有语言产生的复习、收藏和熟记操作都会先进入 outbox，并在下次连接时先于
快照上传。如果 PC 默认学习语言发生变化，下次同步会清除手机覆盖并跟随 PC 新语言。
**今日进度**只统计手机当前学习语言，**待上传**始终统计所有语言。

手机界面语言与学习语言相互独立；配对前后均可切换中文、英文、日文、韩文、法文、
德文、西班牙文和俄文。

## 本地构建

需要 Node.js 22、Java 21 和 Android SDK Platform 36：

```bash
npm ci
npm run android:sync
cd android
./gradlew testDebugUnitTest assembleDebug
```

APK 输出到 `android/app/build/outputs/apk/debug/app-debug.apk`。
