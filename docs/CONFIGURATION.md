# 配置说明

默认配置流程：选择提供商 → 输入 Key → 保存 → 检查连接。所有服务均直接连接官方预设接口，不经过项目自建的中转服务器。

| 提供商 | 预填模型 | 接口 |
| --- | --- | --- |
| DeepSeek | `deepseek-flash` | `https://api.deepseek.com/chat/completions` |
| 通义千问 | `qwen3.8-flash` | `https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions` |
| 智谱 GLM | `glm-4.7-flash` | `https://open.bigmodel.cn/api/paas/v4/chat/completions` |
| Kimi | `kimi-k2.6` | `https://api.moonshot.cn/v1/chat/completions` |
| 硅基流动 | `deepseek-ai/DeepSeek-V4-Flash` | `https://api.siliconflow.cn/v1/chat/completions` |
| 火山方舟 | `doubao-seed-2-0-mini-260428` | `https://ark.cn-beijing.volces.com/api/v3/chat/completions` |

模型和接口预设依据2026年10月核对的官方文档，可能随服务更新变化；不声称最便宜、最新或所有账号均可调用。默认模型可以在高级设置修改。

## 平台要求

- 各服务需要对应开放平台 API Key，账号需有余额、额度及所选模型权限。
- 当前预设使用国内标准接口，不支持海外地域、任意中转地址或 Coding Plan 专用接入。
- 通义千问：若控制台提供的 API 地址包含业务空间 ID，在高级设置中填写该 ID，插件会生成北京地域的业务空间专用地址。只填 ID，不填完整网址。Key 必须与业务空间和地域相符。
- 火山方舟：账号需先开通模型；也可在高级设置填写已开通的模型 ID 或 `ep-` 接入点 ID。
- Kimi：使用开放平台 API Key，不是 Kimi Code 订阅凭据。默认模型在非思考模式下要求0.6温度，插件已适配。

预设模型默认关闭思考模式。若手动改成强制思考或参数不兼容的模型，接口可能报错；插件不会静默切换到其他服务或自行启用高成本模式。

## 状态含义

| 状态 | 含义 |
| --- | --- |
| 未配置 API | 当前服务没有保存的 Key |
| 已配置 · 尚未验证 | 已有 Key，但当前配置组合没有匹配的成功验证记录 |
| 正在检查连接 | 用户主动发起的检查尚未结束 |
| 已配置 · 上次验证成功 | 曾完成成功模型请求，显示历史时间，不代表实时在线 |
| 已配置 · 最近请求失败 | 最近请求失败，但 Key 仍保留；检查错误提示、权限、额度和网络 |

保存 Key 不会自动测试；手动“检查连接”发送一次极短模型请求，可能产生少量用量。实际模型翻译也会更新验证记录。本地缓存或术语命中、查看设置及切换提供商均不触发连接探测。

更换 Key、模型或接口后，不沿用不匹配的旧验证结果。各服务的 Key、模型和验证记录分别保存。

## 官方资料

- [DeepSeek](https://api-docs.deepseek.com/)
- [通义千问接入说明](https://help.aliyun.com/zh/model-studio/first-api-call-to-qwen)
- [智谱 GLM](https://docs.bigmodel.cn/cn/guide/models/free/glm-4.7-flash)
- [Kimi](https://platform.kimi.com/docs/get-api-key)
- [硅基流动](https://docs.siliconflow.cn/docs/api/chat-completions-post)
- [火山方舟](https://docs.volcengine.com/docs/ark/model-list?lang=zh)
