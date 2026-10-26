# PaperContext · 研译

[简体中文](README.md) | **English**

**Built for research reading. Made for beginners. Ready to use.**

**Choose a provider, enter your API key, select text, and read the translation beside it.**

PaperContext is a Zotero plugin for reading research papers with contextual Chinese translations. It uses a limited amount of nearby text and your paper-specific glossary to help interpret technical expressions, without interrupting your reading flow.

Works with **Zotero 10**. Standard presets include the API endpoint and a default model: **no coding, terminal commands, Python environment, Node.js installation, or local translation server is required to use the plugin.**

> Bring your own API key from a supported provider. API usage may cost money, and your account must have access to the selected model. Workspace-specific endpoints and restricted accounts may need additional settings; see [Configuration](docs/CONFIGURATION.md).

[Download the plugin](https://github.com/Liuhuan3333/zotero-papercontext/raw/refs/heads/main/dist/papercontext-0.3.2.xpi) · [Configuration](docs/CONFIGURATION.md) · [Privacy and costs](docs/PRIVACY.md) · [MIT License](LICENSE)

## Four things to know

- **Beginner-friendly setup:** install the XPI, choose a provider, and save your key. The endpoint and default model are already filled in.
- **Stay with the paper:** translated text appears beside the selection inside the PDF reader.
- **Context matters:** limited surrounding text and a glossary help resolve technical terms; request more context when needed.
- **Visible usage:** see local cache hits, API configuration status, and token usage returned by the provider.

## Why PaperContext exists

Reading a research paper involves more than looking up unfamiliar words:

- **The words can be familiar while the meaning is wrong.** An acronym such as `LLM` depends on its field and surrounding argument.
- **Terminology needs consistency within a paper.** Method names, specialized terms, and abbreviations often need to be checked repeatedly.
- **Copying and switching windows breaks concentration.** Translation should help you follow the argument, not interrupt it.
- **Setup should not become another project.** A reading aid should be usable without managing a local runtime or server.
- **More context also means more input.** Sending large sections for every word is not always necessary.

PaperContext addresses these specific reading needs. It does not promise error-free translation or replace your judgment about a paper.

## Features

| Feature | What it does |
| --- | --- |
| Popup or fixed sidebar | Toggle the same result between a popup and a fixed panel; remember the mode without another API call |
| Automatic selection popup | Shows a Simplified Chinese translation beside selected text |
| Context-aware translation | Includes a bounded sentence or nearby paragraph, depending on selection length |
| More context on demand | Adds nearby text only when you click to retranslate with more context |
| Paper-specific glossary | Keeps confirmed terminology consistent within one paper without affecting others |
| Term correction | Saves mappings such as `LLM → 大语言模型` to the current paper |
| Local results | Returns confirmed exact terms and cached translations without an API request |
| Six provider presets | Saves each provider's key, model, and verification record separately |
| Visible API status | Displays the active provider, model, endpoint, and previous verification result |
| Font controls | Adjusts popup translation size with A− / A＋ and remembers your choice |
| Token information | Shows input/output tokens and cache counts when returned by the provider |

## Quick start — no code required

1. [Download `papercontext-0.3.2.xpi`](https://github.com/Liuhuan3333/zotero-papercontext/raw/refs/heads/main/dist/papercontext-0.3.2.xpi). On a GitHub file page, use **Download raw file** if needed.
2. In Zotero, open **Tools → Plugins → gear menu → Install Plugin From File**, then select the XPI.
3. Open **Zotero Settings → 研译**, select your provider, enter your API key, and click **Save key** (`保存密钥`). The current plugin interface is in Chinese.
4. Click **Check connection** (`检查连接`). Open a selectable-text PDF and highlight the text you want to understand.

Click **Pin to side** (`固定到侧边`) to keep the result on the right. Further selections update the fixed panel; **Back to popup** (`返回浮窗`) restores a floating result. Drag the sidebar’s left edge or the popup’s bottom-right handle to resize. Each mode remembers its own width; resizing does not call the API. The choice survives restarts and is also available in settings. Switching reuses the same card and any pending request, without extra API usage.

Updating an existing installation preserves compatible keys, preferences, and paper glossaries. Do not uninstall or delete your data before upgrading.

### Supported providers

**DeepSeek, Alibaba Qwen, Zhipu GLM, Kimi, SiliconFlow, and Volcano Ark.**

Official endpoints and default models are included. Usually, choosing a provider and entering a key is enough. Your account still needs model access; workspace IDs or endpoint IDs required by a provider are entered under advanced settings. See [Configuration](docs/CONFIGURATION.md).

**Configured** means a key is saved. **Previously verified** includes a timestamp and is not a claim that the service is online right now. Opening settings and switching providers do not trigger background connectivity probes.

## Correct a term once, reuse it in the paper

Select `LLM`, choose **Correct term** (`纠正术语`), and save:

```text
Source term: LLM
Confirmed translation: 大语言模型
```

After saving:

- Selecting that exact term in the same paper returns the local confirmed translation, with no API call.
- Sentence translations pass the relevant term as a constraint to the model.
- Other papers remain unaffected, so a field-specific meaning is not imposed globally.

Saving a correction does not automatically retranslate a sentence. Use **Retranslate with terms** (`应用术语重译`) when you want to update it.

## Keep context and costs under control

Short terms use sentence context; short passages use limited nearby paragraphs; long selections usually do not repeat surrounding text. More context is sent only when you request it.

A **local translation cache** is different from a **provider-side input cache**. A local hit avoids an API call. Provider-side caching is controlled by the service and may still be billed. PaperContext keeps reusable prefixes where useful, but does not pad prompts, prewarm requests, or send whole papers to chase a hit rate. There is no guaranteed saving percentage.

Token counts come from the API response. Missing data is identified rather than presented as measured usage. See [Privacy and costs](docs/PRIVACY.md).

## Data and limitations

- API keys are stored separately by provider in Zotero's login credential manager, not in ordinary preferences, translation caches, or the installation package.
- Paper glossaries and a bounded translation cache remain local. The plugin does not automatically sync them or edit original PDF attachments.
- Selected text, necessary surrounding text, a paper title, and relevant glossary terms may be sent to your chosen model provider.
- The current use case is assisting Chinese-language reading of English research papers. PDFs must contain selectable text.
- OCR, whole-document translation, and PDF layout reconstruction are outside the current scope.
- Columns, equations, page breaks, and extraction errors can affect context. Confirm important terminology and conclusions against the original text.

## Development and verification

There are no third-party JavaScript runtime dependencies. **End users do not need Node.js.** Development and packaging require Node.js 20+ and the system `zip` command.

```sh
npm test
npm run build
```

Packages and checksums are written to `dist/`. See [Development notes](docs/DEVELOPMENT.md) and [Changelog](CHANGELOG.md).

Automated checks cover context limits, terminology isolation, cache compatibility, provider parameters, and state handling. Zotero integration has also been checked with virtual responses in an isolated library. This is not a claim that every live API, account, or PDF has been verified.

Bug reports and suggestions are welcome. Include the Zotero/plugin versions, provider/model, and reproduction steps. **Never attach an API key, credential file, or cache containing private content.**

## License

[MIT](LICENSE). API availability, pricing, and service terms are determined by the selected provider.
