import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';

export const ROOT_DIR_NAME = 'MediaOrganizer';
export const EXPORTS_DIR_NAME = 'exports';

// expo-file-system's native Directory/File classes are not implemented on
// web (Snapfolio is designed for native camera + share-sheet flows). Guard
// every disk operation so the web preview target doesn't crash on mount.
const isWeb = Platform.OS === 'web';

// Stand-in used only on web, where the native file-system module has no
// backing implementation. Nothing on web actually reads/writes through it.
const webStubDirectory = { uri: 'web://unsupported', exists: false } as unknown as Directory;

function safeDirectory(build: () => Directory): Directory {
  if (isWeb) return webStubDirectory;
  try {
    const dir = build();
    if (!dir.exists) {
      dir.create({ intermediates: true, idempotent: true });
    }
    return dir;
  } catch (err) {
    console.warn('Failed to prepare directory', err);
    return webStubDirectory;
  }
}

/** Root directory that holds one subdirectory per folder, named by folder id. */
export function getRootDirectory(): Directory {
  return safeDirectory(() => new Directory(Paths.document, ROOT_DIR_NAME));
}

/** Directory for a specific folder, created on demand. */
export function getFolderDirectory(folderId: string): Directory {
  return safeDirectory(() => new Directory(getRootDirectory(), folderId));
}

export function getItemFile(folderId: string, fileName: string): File {
  if (isWeb) return { uri: 'web://unsupported', exists: false } as unknown as File;
  return new File(getFolderDirectory(folderId), fileName);
}

/** Scratch directory (cache) for generated PDFs and ZIPs. */
export function getExportsDirectory(): Directory {
  return safeDirectory(() => new Directory(Paths.cache, EXPORTS_DIR_NAME));
}

export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Strips characters that are unsafe in file/directory names. */
export function sanitizeFileName(name: string): string {
  const trimmed = name.trim().replace(/[\\/:*?"<>|]/g, '-');
  return trimmed.length > 0 ? trimmed : 'untitled';
}

export function extensionFromUri(uri: string, fallback: string): string {
  const withoutQuery = uri.split('?')[0] ?? uri;
  const match = withoutQuery.match(/\.[a-zA-Z0-9]+$/);
  return match ? match[0].toLowerCase() : fallback;
}

/** Builds the default "Upload_YYYY_MM_DD" folder name for today. */
export function todayFolderName(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `Upload_${now.getFullYear()}_${pad(now.getMonth() + 1)}_${pad(now.getDate())}`;
}

/** Ensures a unique file name inside a Set of already-used names. */
export function uniqueName(used: Set<string>, name: string): string {
  if (!used.has(name)) {
    used.add(name);
    return name;
  }
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  let index = 2;
  let candidate = `${base} (${index})${ext}`;
  while (used.has(candidate)) {
    index += 1;
    candidate = `${base} (${index})${ext}`;
  }
  used.add(candidate);
  return candidate;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}
