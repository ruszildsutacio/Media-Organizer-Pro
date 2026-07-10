import JSZip from 'jszip';
import { Directory, File } from 'expo-file-system';
import { getExportsDirectory, getItemFile, sanitizeFileName, uniqueName } from '@/lib/fs';
import type { MediaFolder, MediaItem } from '@/types/media';

/**
 * Compresses every media file inside a folder into a single .zip archive
 * (nested under a directory named after the folder, preserving structure)
 * and saves the result into the app's cache directory.
 */
export async function zipFolder(folder: MediaFolder, items: MediaItem[]): Promise<File> {
  const zip = new JSZip();
  const rootName = sanitizeFileName(folder.name) || 'Folder';
  const root = zip.folder(rootName) ?? zip;
  const usedNames = new Set<string>();

  for (const item of items) {
    const file = getItemFile(item.folderId, item.fileName);
    if (!file.exists) continue;
    const base64 = await file.base64();
    const displayName = sanitizeFileName(item.displayName) || item.fileName;
    const hasExtension = displayName.toLowerCase().endsWith(item.extension.toLowerCase());
    const candidateName = hasExtension ? displayName : `${displayName}${item.extension}`;
    const name = uniqueName(usedNames, candidateName);
    root.file(name, base64, { base64: true });
  }

  const zipBase64 = await zip.generateAsync({ type: 'base64', compression: 'DEFLATE' });

  const exportsDir: Directory = getExportsDirectory();
  const fileName = `${rootName}-${Date.now()}.zip`;
  const destination = new File(exportsDir, fileName);
  if (destination.exists) {
    destination.delete();
  }
  destination.create();
  destination.write(zipBase64, { encoding: 'base64' });

  return destination;
}
