---
name: Folder id vs display name decoupling
description: Pattern for building a user-renamable file/folder organizer app without touching the filesystem on rename.
---

When building an app that lets users create/rename folders and files (e.g. a media organizer), store folders on disk under a stable, non-user-facing id (e.g. `MediaOrganizer/<folderId>/<itemId>.<ext>`), and keep the user-editable `name`/`displayName` only in app metadata (AsyncStorage or a DB row).

**Why:** Renaming then becomes a pure metadata update — no directory/file move or rename on disk, no risk of broken references, no OS path-length/charset edge cases from user-typed names.

**How to apply:** Generate ids at creation time (e.g. `Date.now().toString(36) + random suffix`) and never derive filesystem paths from user-supplied text. Only sanitize user text when it must appear in an exported artifact (e.g. a filename inside a generated ZIP/PDF for sharing).
