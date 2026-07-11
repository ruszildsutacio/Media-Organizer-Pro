import { Platform } from 'react-native';
import { Directory, File } from 'expo-file-system';
import * as Print from 'expo-print';
import { getExportsDirectory, sanitizeFileName } from '@/lib/fs';
import { getImageDataUrlAndSize, triggerBrowserDownload } from '@/lib/webExport';
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

/** Result of a PDF export. On native this is a real File; on web there is
 * no filesystem, so the browser triggers a direct download instead and the
 * returned "uri" is only used for display purposes. */
export interface PdfExportResult {
  uri: string;
  webDownloaded?: boolean;
}

/**
 * Compiles the given photos into a single PDF (one photo per page). On
 * native the result is saved into the app's cache directory; on web the
 * browser downloads the PDF directly.
 */
export async function generatePdfFromItems(
  folderName: string,
  sources: PdfSourceItem[],
): Promise<PdfExportResult> {
  if (sources.length === 0) {
    throw new Error('Select at least one photo to convert to PDF.');
  }

  if (Platform.OS === 'web') {
    return generatePdfOnWeb(folderName, sources);
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

  return { uri: destination.uri };
}

async function generatePdfOnWeb(
  folderName: string,
  sources: PdfSourceItem[],
): Promise<PdfExportResult> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt' });

  for (let i = 0; i < sources.length; i += 1) {
    const { uri } = sources[i];
    const { dataUrl, width, height } = await getImageDataUrlAndSize(uri);
    if (i > 0) doc.addPage();

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const scale = Math.min(pageWidth / width, pageHeight / height);
    const drawWidth = width * scale;
    const drawHeight = height * scale;
    const x = (pageWidth - drawWidth) / 2;
    const y = (pageHeight - drawHeight) / 2;
    doc.addImage(dataUrl, 'JPEG', x, y, drawWidth, drawHeight, undefined, 'FAST');
  }

  const fileName = `${sanitizeFileName(folderName)}-${Date.now()}.pdf`;
  const blob = doc.output('blob');
  triggerBrowserDownload(blob, fileName);
  return { uri: fileName, webDownloaded: true };
}
