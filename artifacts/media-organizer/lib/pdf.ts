import { Directory, File } from 'expo-file-system';
import * as Print from 'expo-print';
import { getExportsDirectory, sanitizeFileName } from '@/lib/fs';
import type { MediaItem } from '@/types/media';

function mimeForExtension(extension: string): string {
  const ext = extension.toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.heic') return 'image/heic';
  if (ext === '.webp') return 'image/webp';
  return 'image/jpeg';
}

export interface PdfSourceItem {
  item: MediaItem;
  uri: string;
}

/**
 * Compiles the given photos into a single PDF (one photo per page) and
 * saves the result into the app's cache directory.
 */
export async function generatePdfFromItems(
  folderName: string,
  sources: PdfSourceItem[],
): Promise<File> {
  if (sources.length === 0) {
    throw new Error('Select at least one photo to convert to PDF.');
  }

  const pageMarkup = await Promise.all(
    sources.map(async ({ item, uri }) => {
      const file = new File(uri);
      const base64 = await file.base64();
      const mime = mimeForExtension(item.extension);
      return `<div class="page"><img src="data:${mime};base64,${base64}" /></div>`;
    }),
  );

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 100%; height: 100%; }
      .page {
        width: 100%;
        height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        page-break-after: always;
        padding: 24px;
      }
      .page:last-child { page-break-after: auto; }
      img { max-width: 100%; max-height: 100%; object-fit: contain; }
    </style>
  </head>
  <body>${pageMarkup.join('')}</body>
</html>`;

  const { uri: printedUri } = await Print.printToFileAsync({ html, base64: false });

  const exportsDir: Directory = getExportsDirectory();
  const fileName = `${sanitizeFileName(folderName)}-${Date.now()}.pdf`;
  const destination = new File(exportsDir, fileName);
  if (destination.exists) {
    destination.delete();
  }
  new File(printedUri).copy(destination);

  return destination;
}
