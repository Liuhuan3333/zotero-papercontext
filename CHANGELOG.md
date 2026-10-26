# Changelog

## 0.3.1

- Drag the fixed sidebar left edge or popup bottom-right handle to resize.
- Remember independent widths, clamp to the reader viewport, and keep the current result without extra API calls.

## 0.3.0

- Add popup/fixed-sidebar switching and remember the display mode across restarts.
- Move the current result without another API request; keep pending translations and existing controls.
- Reserve reader width for the fixed panel; update it on further selections.

## 0.2.1

- 公开名称调整为「研译 PaperContext」，完善功能、科研阅读场景、配置、隐私与费用说明。
- 保留原有插件标识、凭据、偏好与术语格式，已有用户可直接覆盖升级。
- 不改变翻译算法和模型默认配置。

## 0.2.0

- 增加通义千问、智谱 GLM、Kimi、硅基流动和火山方舟预设，连同 DeepSeek 共六家。
- 独立保存各服务的密钥、模型及验证记录。
- 设置页与浮窗显示配置状态，展示模型、接口地址和历史验证时间。
- 按服务适配参数，按提供商与接口隔离模型译文缓存。

## 0.1.1

- 修复配置按钮文字对齐。
- 新增浮窗字号调节与记忆。
- 优化稳定输入前缀，显示服务端缓存用量，并复用旧版本地缓存。

## 0.1.0

- 自动选区翻译、受限上下文、论文术语与纠正、本地缓存、基础 API 配置。
