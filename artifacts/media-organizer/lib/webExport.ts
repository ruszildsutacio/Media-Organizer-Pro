// Helpers for the web preview target, which has no native filesystem or
// share sheet. Instead we fetch picker-provided blob/data URIs directly and
// trigger normal browser downloads.

export interface ImageDataUrlResult {
  dataUrl: string;
  width: number;
  height: number;
}

/** Fetches a blob/data URI and resolves it to a base64 data URL plus its
 * natural pixel dimensions (needed to lay it out on a PDF page). */
export function getImageDataUrlAndSize(uri: string): Promise<ImageDataUrlResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = async () => {
      try {
        const dataUrl = await uriToDataUrl(uri);
        resolve({ dataUrl, width: img.naturalWidth || 1, height: img.naturalHeight || 1 });
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('Could not load image for export.'));
    img.src = uri;
  });
}

/** Converts any fetchable URI (blob:, data:, http:) into a base64 data URL. */
export async function uriToDataUrl(uri: string): Promise<string> {
  if (uri.startsWith('data:')) return uri;
  const response = await fetch(uri);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read file for export.'));
    reader.readAsDataURL(blob);
  });
}

/** Converts any fetchable URI into a raw base64 string (no data: prefix). */
export async function uriToBase64(uri: string): Promise<string> {
  const dataUrl = await uriToDataUrl(uri);
  const comma = dataUrl.indexOf(',');
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
}

/** Triggers a normal browser file download for the given blob. */
export function triggerBrowserDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
