import { Platform } from 'react-native';
import { File } from 'expo-file-system';
// The Storage Access Framework only exists in the legacy expo-file-system
// API (removed from the new Directory/File API used elsewhere in this app).
import * as LegacyFileSystem from 'expo-file-system/legacy';

const { StorageAccessFramework } = LegacyFileSystem;

export interface SaveToPublicStorageResult {
  saved: boolean;
  uri?: string;
}

/**
 * Saves a file that currently lives in the app's private cache directory
 * into a public, user-visible location (e.g. "Downloads") so it's
 * accessible outside the app — not just via the share sheet.
 *
 * Android only: uses the Storage Access Framework to let the user pick a
 * public directory, then copies the file there. Returns `{ saved: false }`
 * on iOS/web (no public-storage concept on iOS; web downloads already land
 * in the browser's Downloads folder automatically) or if the user declines
 * the directory picker — callers should fall back to the share sheet.
 */
export async function saveFileToPublicStorage(
  sourceUri: string,
  fileName: string,
  mimeType: string,
): Promise<SaveToPublicStorageResult> {
  if (Platform.OS !== 'android') {
    return { saved: false };
  }

  try {
    const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (!permissions.granted) {
      return { saved: false };
    }

    const destinationUri = await StorageAccessFramework.createFileAsync(
      permissions.directoryUri,
      fileName,
      mimeType,
    );

    const source = new File(sourceUri);
    const base64 = await source.base64();
    await LegacyFileSystem.writeAsStringAsync(destinationUri, base64, {
      encoding: LegacyFileSystem.EncodingType.Base64,
    });

    return { saved: true, uri: destinationUri };
  } catch (err) {
    console.warn('Failed to save file to public storage', err);
    return { saved: false };
  }
}

/** Extracts a usable file name from a file:// or content:// URI. */
export function fileNameFromUri(uri: string, fallback: string): string {
  const withoutQuery = uri.split('?')[0] ?? uri;
  const segment = withoutQuery.split('/').pop();
  return segment && segment.length > 0 ? decodeURIComponent(segment) : fallback;
}
