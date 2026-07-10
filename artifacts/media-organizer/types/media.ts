export type MediaType = 'photo' | 'video';

export interface MediaFolder {
  id: string;
  name: string;
  createdAt: number;
}

export interface MediaItem {
  id: string;
  folderId: string;
  type: MediaType;
  /** Physical file name on disk, e.g. `${id}.jpg`. Never changes. */
  fileName: string;
  /** User-facing, editable name (without extension). */
  displayName: string;
  extension: string;
  createdAt: number;
}
