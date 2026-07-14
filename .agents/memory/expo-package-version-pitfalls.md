---
name: Expo native package version pitfalls
description: How to pick the correct version when adding a new Expo SDK module (e.g. expo-video) to an existing Expo app, and where legacy-only APIs still live.
---

- `pnpm add <expo-module>` without a version pin resolves npm's `latest` tag, which can be far ahead of what the installed Expo SDK supports (e.g. resolved `expo-video@57.0.0` while the project's `expo` package was `54.0.35`, which expects `expo-video@~3.0.16`). This breaks Expo Go compatibility.
- **How to apply:** before adding any `expo-*` native module, check `node_modules/expo/bundledNativeModules.json` (or the peer version listed in `expo`'s own `package.json` "dependencies" for that module name) for the version the installed Expo SDK expects, and pin to that with `pnpm add <module>@<version>` instead of trusting the unpinned resolution.
- Storage Access Framework (`StorageAccessFramework`, used to save files to a public Android folder like Downloads) was dropped from the new `expo-file-system` default API (v19+) but still exists under the legacy subpath: `import * as LegacyFileSystem from 'expo-file-system/legacy'`. No `exports` field restricts this subpath, so it resolves fine even though it's not listed in the package's typed entrypoint.
