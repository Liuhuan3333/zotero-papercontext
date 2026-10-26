# 开发说明

## 文件结构

- `plugin/bootstrap.js`：Zotero 生命周期、原生阅读器浮窗、凭据与状态、本机保存。
- `plugin/display.js`：浮窗与固定侧栏挂载、宽度恢复和显示状态；不发送翻译请求。
- `plugin/core.js`：上下文策略、术语、缓存键和响应处理；可独立测试。
- `plugin/reader-context.js`：PDF 阅读器文字结构与选区适配。
- `plugin/providers.js`：官方提供商预设、请求参数和状态判断。
- `plugin/prefs.*`：简化配置页面。
- `tests/`：Node 内置测试，无第三方测试框架。
- `dist/`：可安装的 XPI 和 SHA256 校验值。

需要 Node.js 20+ 及系统 `zip` 命令。使用 `npm test` 验证，`npm run build` 构建。

## 升级兼容

公开名称是研译 PaperContext。为让已有安装直接升级，保留插件 ID `contextleaf@local.tools`、内部 `ContextLeaf` 命名空间、偏好前缀、数据目录和原有凭据 realm。请勿只为统一命名而修改这些内部标识，否则可能导致配置丢失或被 Zotero 视为另一个安装。

0.2.1 是名称与开源包装更新，不增加网络权限，不改变翻译算法、模型预设或保存格式。

## 验证边界

自动测试覆盖上下文限额、术语隔离/纠正、缓存与旧版兼容、服务间缓存隔离、请求参数、字号和状态判断。此前的 Zotero 集成使用独立资料库和虚拟服务响应验证，不代表每家真实 API、所有账号或所有 PDF 均已验证。

PDF 上下文适配使用阅读器内部文字结构。未来 Zotero 更新后，需定向检查选区浮窗、分栏/跨页文本和设置脚本。当前清单支持 Zotero 10，不宣称兼容其他大版本。

## 发布

修改 `plugin/manifest.json` 与 `package.json` 中的版本，运行测试并构建，将新的 XPI 与 `SHA256SUMS.txt` 一起提供。只打包 `plugin/`，不要包含本机凭据、profile、日志、译文缓存或个人资料。

当前版本采用手动安装更新。清单保留 HTTPS 更新字段以满足 Zotero 要求；其 `.invalid` 地址不是真实更新服务，插件关闭自身后台自动更新。
