# Android 离线复习与设备同步

`0.3.0-alpha` 支持一台 PC 配对一台 Android 手机。首次同步后，即使 PC
关机，手机仍可离线复习文字、图片和音频；复习事件保存在加密 outbox 中，当前手动
选择的通道恢复后再上传。

Android 客户端最低要求 Android 7.0 / API 24。Capacitor 8 已不再支持计划草案中
的 API 23。应用 ID 为 `io.github.yaqxuan.contextvocabularynotebook`。

## 安装 APK

从 GitHub Release 下载 APK 和同名 `.sha256` 文件，校验后再安装。PR 和缺少签名
材料的 tag 构建只会产生短期 Debug artifact，不会创建公开 Release。

发布工作流只从 GitHub Actions secrets 读取以下材料，仓库和 artifact 都不保存：

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

## 启用 PC 同步服务

在 `.env` 加入并重启 PC 应用：

```env
CVN_DEVICE_SYNC=1
```

普通网页和 API 继续只监听 localhost。设备同步使用独立、受限的 `/v1` 服务，不会
暴露卡片编辑、AI 配置、API Key、导入导出和普通媒体 API。

打开 **设置 → Android 离线同步**。首次配对会在默认的
`data/sync-identity/` 生成长期 P-256 PC 身份和自签名证书。不要把身份目录复制到
另一台 PC；身份丢失或轮换后需要重新配对。

## 局域网模式

1. 在 PC 设置中启用局域网同步并重启应用。
2. 只在可信/专用网络中允许 TCP `3109` 入站。
3. 创建五分钟有效的配对二维码。
4. Android 扫码后，在 PC 确认显示的设备名称。
5. 手机保持选择 **局域网**。

PC 通过 `_cvn-sync._tcp.local` 发布 mDNS。广播只用于寻找地址，Android 始终校验
已保存的完整 SHA-256 SPKI 指纹。mDNS 不可用时使用二维码保存的地址或手动地址。
IP 改变不用重新配对；证书身份改变才需要。

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
显示精确的 Hyper-V 防火墙命令，但不会自动提权执行。Microsoft 官方说明见
[WSL 网络应用访问](https://learn.microsoft.com/zh-cn/windows/wsl/networking)。

NAT 模式不承诺 mDNS 与直接连接。排障时可手动设置 Windows
`netsh interface portproxy` 和限定范围的防火墙规则，但 WSL 地址改变后必须更新；
长期使用请改为 mirrored。

## Tailscale 模式

设置页只读检测 Tailscale，不会修改系统配置。请自行运行：

```bash
tailscale serve --bg 3108
```

保存生成的 MagicDNS `https://...ts.net` 地址，创建配对二维码，然后在 Android
选择 **Tailscale**。不要启用 Funnel。Tailnet ACL 和应用凭据必须同时允许；任何
一层失败都不会自动切换到局域网或明文 HTTP。

## 同步语义

每次同步依次检查协议、上传连续事件、由 PC 重放受影响卡片、原子替换手机文本快照、
用 Range 补齐并校验图片/音频哈希，最后确认修订。视频只保存元数据，不复制原文件。

手机在启动、回到前台或点击 **立即同步** 时同步，不注册 Android 后台任务。切换
局域网/Tailscale 不会创建新设备，也不会重置 outbox、快照修订或媒体缓存。

## 本地构建

需要 Node.js 22、Java 21 和 Android SDK Platform 36：

```bash
npm ci
npm run android:sync
cd android
./gradlew testDebugUnitTest assembleDebug
```

APK 输出到 `android/app/build/outputs/apk/debug/app-debug.apk`。
