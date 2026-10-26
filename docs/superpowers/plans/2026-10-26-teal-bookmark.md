# Teal bookmark implementation

Goal: apply the approved visual design without changing translation requests or display behavior.

1. Create the local vector brand icon and a shared scoped color-token stylesheet with Zotero-aware light/dark variants.
2. Style settings and translation cards; group font controls and add decorative action icons, local-result and saved feedback. Keep accessibility labels and existing action text.
3. Render a light/dark preview from the actual styles. Run existing Node checks and the targeted isolated Zotero regression, including first-click mode switching, remembered widths and outside dismissal; use simulated API responses.
4. Package v0.4.0, update bilingual documentation, install over the existing addon ID, and publish to GitHub.

Use minimal changes and one focused validation pass. No additional runtime dependency for users; no other plugin references in public content.

Validation: 25 Node tests passed; 36 checks passed in an isolated Zotero reader with two simulated translation responses. Theme colors, local icon, grouped controls, loading cleanup and local badges were checked alongside switching/resizing/dismissal regressions. Reader styles are injected from the packaged local CSS using Zotero.File.getResourceAsync, which supports both file and jar resources. Final integration is run against the built XPI, not a source-directory pointer.
