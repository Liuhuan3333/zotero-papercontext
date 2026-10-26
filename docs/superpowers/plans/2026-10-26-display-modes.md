# Floating and fixed translation display

Goal: keep selection popups by default, allow a right-side fixed panel, remember the user's mode, and never retranslate just to move the result.

Implementation uses a small display module and the existing card/request state. A dedicated panel inside each reader reserves PDF width and leaves Zotero's metadata and annotations untouched. Returning to a closed native popup uses a floating card at the last selection location. All existing term, context and font controls remain available.

- [x] Add focused mode-persistence tests and an isolated Zotero integration check for completed and pending translations, repeated selections, close, document isolation and restored mode.
- [x] Add display mounting/cleanup, header toggle, persistent preference and settings mode selector. Move the same card; keep its request token and timer unchanged.
- [x] Build 0.3.0, run existing tests and one targeted Zotero verification with simulated responses. No real API calls for validation.
- [x] Update bilingual instructions and install the compatible XPI locally.
- [x] Publish source/package to GitHub.

Authorized scope: no local runtime dependency for users, retain existing addon ID, keys and paper glossary, and no other plugin comparisons in public files. User has approved implementation, installation and publication; no further design approval is needed.

Validation: 24 Node tests passed; 21 checks in an isolated Zotero 10 reader passed with two simulated API responses. Completed and pending result switches made no additional request. PDF width, native popup dismissal, subsequent selections, glossary correction, font controls, settings and cleanup were checked. A native popup must be dismissed through its selection API in the harness, not by removing a React-owned node.
