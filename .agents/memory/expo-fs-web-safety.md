---
name: Expo file-system web safety
description: expo-file-system's sync Directory/File API has no working implementation on the web target, and crashes at construction time rather than degrading gracefully.
---

Calling `new Directory(...)`, `.exists`, or `.create()` from `expo-file-system` (v19 sync API) throws on web (e.g. `this.validatePath is not a function`). This crashes the whole app immediately on mount if directory setup happens in a provider/layout, since Expo web preview is often used to visually verify Expo apps in this environment.

**Why:** Screenshot/preview tooling for Expo apps renders via the web target, so a web-only crash blocks all visual verification even though the app is really meant for native (iOS/Android/Expo Go).

**How to apply:** Wrap all `expo-file-system` directory/file construction and disk I/O behind `Platform.OS !== 'web'` guards (or try/catch with a stub fallback object). Let real file operations only run natively; return an inert stub object on web so the rest of the UI still renders for preview purposes.
