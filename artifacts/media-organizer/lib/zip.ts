import { Platform } from 'react-native';
import JSZip from 'jszip';
import { Directory, File } from 'expo-file-system';
import { getExportsDirectory, getItemFile, sanitizeFileName, uniqueName } from '@/lib/fs';
import { triggerBrowserDownload, uriToBase64 } from '@/lib/webExport';
import type { MediaFolder, MediaItem } from '@/types/media';

export interface ZipExportResult {
  uri: string;
  webDownloaded?: boolean;
}

/**
 * Compresses every media file inside a folder into a single .zip archive
 * (nested under a directory named after the folder, preserving structure).
 * On native the result is saved into the app's cache directory; on web the
 * browser downloads the zip directly.
 */
export async function zipFolder(folder: MediaFolder, items: MediaItem[]): Promise<ZipExportResult> {
  const isWeb = Platform.OS === 'web';
  const zip = new JSZip();
  const rootName = sanitizeFileName(folder.name) || 'Folder';
  const root = zip.folder(rootName) ?? zip;
  const usedNames = new Set<string>();

  for (const item of items) {
    const base64 = isWeb
      ? item.webUri
        ? await uriToBase64(item.webUri)
        : null
      : await (() => {
          const file = getItemFile(item.folderId, item.fileName);
          return file.exists ? file.base64() : null;
        })();
    if (base64 == null) continue;

    const displayName = sanitizeFileName(item.displayName) || item.fileName;
    const hasExtension = displayName.toLowerCase().endsWith(item.extension.toLowerCase());
    const candidateName = hasExtension ? displayName : `${displayName}${item.extension}`;
    const name = uniqueName(usedNames, candidateName);
    root.file(name, base64, { base64: true });
  }

  const fileName = `${rootName}-${Date.now()}.zip`;

  if (isWeb) {
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    triggerBrowserDownload(blob, fileName);
    return { uri: fileName, webDownloaded: true };
  }

  const zipBase64 = await zip.generateAsync({ type: 'base64', compression: 'DEFLATE' });
  const exportsDir: Directory = getExportsDirectory();
  const destination = new File(exportsDir, fileName);
  if (destination.exists) {
    destination.delete();
  }
  destination.create();
  destination.write(zipBase64, { encoding: 'base64' });

  return { uri: destination.uri };
}
