import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File } from 'expo-file-system';
import {
  extensionFromUri,
  generateId,
  getFolderDirectory,
  getItemFile,
  getRootDirectory,
  todayFolderName,
} from '@/lib/fs';
import type { MediaFolder, MediaItem, MediaType } from '@/types/media';

const FOLDERS_KEY = '@snapfolio/folders';
const ITEMS_KEY = '@snapfolio/items';

interface CaptureParams {
  uri: string;
  type: MediaType;
  folderId?: string;
}

interface MediaLibraryContextValue {
  ready: boolean;
  folders: MediaFolder[];
  items: MediaItem[];
  getItemsForFolder: (folderId: string) => MediaItem[];
  getFolderById: (folderId: string) => MediaFolder | undefined;
  getFolderCover: (folderId: string) => MediaItem | undefined;
  getItemUri: (item: MediaItem) => string;
  createFolder: (name: string) => MediaFolder;
  renameFolder: (folderId: string, name: string) => void;
  deleteFolder: (folderId: string) => void;
  renameItem: (itemId: string, displayName: string) => void;
  deleteItem: (itemId: string) => void;
  captureMedia: (params: CaptureParams) => Promise<MediaItem>;
  ensureTodayFolder: () => MediaFolder;
  getLatestFolder: () => MediaFolder | undefined;
  ensureLatestFolder: () => MediaFolder;
}

const MediaLibraryContext = createContext<MediaLibraryContextValue | null>(null);

async function persist(folders: MediaFolder[], items: MediaItem[]) {
  try {
    await AsyncStorage.multiSet([
      [FOLDERS_KEY, JSON.stringify(folders)],
      [ITEMS_KEY, JSON.stringify(items)],
    ]);
  } catch (err) {
    console.warn('Failed to persist media library', err);
  }
}

export function MediaLibraryProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [items, setItems] = useState<MediaItem[]>([]);

  useEffect(() => {
    (async () => {
      getRootDirectory();
      try {
        const [[, rawFolders], [, rawItems]] = await AsyncStorage.multiGet([
          FOLDERS_KEY,
          ITEMS_KEY,
        ]);
        setFolders(rawFolders ? (JSON.parse(rawFolders) as MediaFolder[]) : []);
        setItems(rawItems ? (JSON.parse(rawItems) as MediaItem[]) : []);
      } catch (err) {
        console.warn('Failed to load media library', err);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const getItemsForFolder = useCallback(
    (folderId: string) =>
      items.filter((item) => item.folderId === folderId).sort((a, b) => b.createdAt - a.createdAt),
    [items],
  );

  const getFolderById = useCallback(
    (folderId: string) => folders.find((folder) => folder.id === folderId),
    [folders],
  );

  const getFolderCover = useCallback(
    (folderId: string) => {
      const folderItems = items
        .filter((item) => item.folderId === folderId)
        .sort((a, b) => b.createdAt - a.createdAt);
      return folderItems.find((item) => item.type === 'photo') ?? folderItems[0];
    },
    [items],
  );

  const getItemUri = useCallback((item: MediaItem) => {
    if (item.webUri) return item.webUri;
    return getItemFile(item.folderId, item.fileName).uri;
  }, []);

  const createFolder = useCallback(
    (name: string): MediaFolder => {
      const folder: MediaFolder = {
        id: generateId(),
        name: name.trim() || 'Untitled folder',
        createdAt: Date.now(),
      };
      getFolderDirectory(folder.id);
      const nextFolders = [folder, ...folders];
      setFolders(nextFolders);
      persist(nextFolders, items);
      return folder;
    },
    [folders, items],
  );

  const ensureTodayFolder = useCallback((): MediaFolder => {
    const name = todayFolderName();
    const existing = folders.find((folder) => folder.name === name);
    if (existing) return existing;
    return createFolder(name);
  }, [folders, createFolder]);

  const getLatestFolder = useCallback((): MediaFolder | undefined => {
    if (folders.length === 0) return undefined;
    return [...folders].sort((a, b) => b.createdAt - a.createdAt)[0];
  }, [folders]);

  const ensureLatestFolder = useCallback((): MediaFolder => {
    const latest = getLatestFolder();
    if (latest) return latest;
    return createFolder('Default Folder');
  }, [getLatestFolder, createFolder]);

  const renameFolder = useCallback(
    (folderId: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const nextFolders = folders.map((folder) =>
        folder.id === folderId ? { ...folder, name: trimmed } : folder,
      );
      setFolders(nextFolders);
      persist(nextFolders, items);
    },
    [folders, items],
  );

  const deleteFolder = useCallback(
    (folderId: string) => {
      const dir = new Directory(getRootDirectory(), folderId);
      if (dir.exists) {
        dir.delete();
      }
      const nextFolders = folders.filter((folder) => folder.id !== folderId);
      const nextItems = items.filter((item) => item.folderId !== folderId);
      setFolders(nextFolders);
      setItems(nextItems);
      persist(nextFolders, nextItems);
    },
    [folders, items],
  );

  const renameItem = useCallback(
    (itemId: string, displayName: string) => {
      const trimmed = displayName.trim();
      if (!trimmed) return;
      const nextItems = items.map((item) =>
        item.id === itemId ? { ...item, displayName: trimmed } : item,
      );
      setItems(nextItems);
      persist(folders, nextItems);
    },
    [folders, items],
  );

  const deleteItem = useCallback(
    (itemId: string) => {
      const target = items.find((item) => item.id === itemId);
      if (target) {
        const file = getItemFile(target.folderId, target.fileName);
        if (file.exists) {
          file.delete();
        }
      }
      const nextItems = items.filter((item) => item.id !== itemId);
      setItems(nextItems);
      persist(folders, nextItems);
    },
    [folders, items],
  );

  const captureMedia = useCallback(
    async ({ uri, type, folderId }: CaptureParams): Promise<MediaItem> => {
      const targetFolder = folderId ? getFolderById(folderId) : ensureTodayFolder();
      if (!targetFolder) {
        throw new Error('Destination folder could not be found.');
      }

      const countInFolder = items.filter((item) => item.folderId === targetFolder.id).length;
      const id = generateId();
      const extension = extensionFromUri(uri, type === 'video' ? '.mov' : '.jpg');
      const fileName = `${id}${extension}`;

      // The web target has no working native file-system implementation, so
      // web captures reference the picker's original blob/data URI directly
      // instead of being copied into app storage.
      if (Platform.OS !== 'web') {
        const destination = getItemFile(targetFolder.id, fileName);
        const source = new File(uri);
        source.copy(destination);
      }

      const item: MediaItem = {
        id,
        folderId: targetFolder.id,
        type,
        fileName,
        displayName: `${type === 'photo' ? 'Photo' : 'Video'} ${countInFolder + 1}`,
        extension,
        createdAt: Date.now(),
        webUri: Platform.OS === 'web' ? uri : undefined,
      };

      const nextItems = [item, ...items];
      setItems(nextItems);
      persist(folders, nextItems);
      return item;
    },
    [items, folders, getFolderById, ensureTodayFolder],
  );

  const value = useMemo<MediaLibraryContextValue>(
    () => ({
      ready,
      folders,
      items,
      getItemsForFolder,
      getFolderById,
      getFolderCover,
      getItemUri,
      createFolder,
      renameFolder,
      deleteFolder,
      renameItem,
      deleteItem,
      captureMedia,
      ensureTodayFolder,
      getLatestFolder,
      ensureLatestFolder,
    }),
    [
      ready,
      folders,
      items,
      getItemsForFolder,
      getFolderById,
      getFolderCover,
      getItemUri,
      createFolder,
      renameFolder,
      deleteFolder,
      renameItem,
      deleteItem,
      captureMedia,
      ensureTodayFolder,
      getLatestFolder,
      ensureLatestFolder,
    ],
  );

  return <MediaLibraryContext.Provider value={value}>{children}</MediaLibraryContext.Provider>;
}

export function useMediaLibrary(): MediaLibraryContextValue {
  const ctx = useContext(MediaLibraryContext);
  if (!ctx) {
    throw new Error('useMediaLibrary must be used within a MediaLibraryProvider');
  }
  return ctx;
}
