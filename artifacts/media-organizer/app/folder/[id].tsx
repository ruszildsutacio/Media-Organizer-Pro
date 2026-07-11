import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActionMenu, type ActionMenuOption } from '@/components/ActionMenu';
import { EmptyState } from '@/components/EmptyState';
import { MediaThumb } from '@/components/MediaThumb';
import { PromptModal } from '@/components/PromptModal';
import { ProgressOverlay } from '@/components/ProgressOverlay';
import { useMediaLibrary } from '@/context/MediaLibraryContext';
import { useColors } from '@/hooks/useColors';
import { generatePdfFromItems } from '@/lib/pdf';
import { zipFolder } from '@/lib/zip';
import type { MediaItem } from '@/types/media';

const isWeb = Platform.OS === 'web';

export default function FolderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    getFolderById,
    getItemsForFolder,
    getItemUri,
    renameFolder,
    deleteFolder,
    renameItem,
    deleteItem,
    captureMedia,
  } = useMediaLibrary();

  const folder = getFolderById(id);
  const items = getItemsForFolder(id);

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [addMenuVisible, setAddMenuVisible] = useState(false);
  const [folderMenuVisible, setFolderMenuVisible] = useState(false);
  const [itemMenuTarget, setItemMenuTarget] = useState<MediaItem | null>(null);
  const [renameFolderVisible, setRenameFolderVisible] = useState(false);
  const [renameItemTarget, setRenameItemTarget] = useState<MediaItem | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  const [cameraPermission, requestCameraPermission] = ImagePicker.useCameraPermissions();
  const [libraryPermission, requestLibraryPermission] = ImagePicker.useMediaLibraryPermissions();

  const selectedPhotos = useMemo(
    () => items.filter((item) => item.type === 'photo' && selectedIds.has(item.id)),
    [items, selectedIds],
  );

  if (!folder) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState icon="alert-circle" title="Folder not found" message="This folder may have been deleted." />
      </View>
    );
  }

  async function ensureCameraPermission(): Promise<boolean> {
    if (cameraPermission?.granted) return true;
    if (cameraPermission && !cameraPermission.canAskAgain) {
      Alert.alert('Camera access needed', 'Enable camera access in Settings to capture media.');
      return false;
    }
    const result = await requestCameraPermission();
    return result.granted;
  }

  async function handleCapture(type: 'photo' | 'video') {
    const granted = await ensureCameraPermission();
    if (!granted) return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: type === 'photo' ? ['images'] : ['videos'],
      quality: 0.8,
      videoMaxDuration: 120,
    });
    if (result.canceled || !result.assets?.[0]) return;
    await captureMedia({ uri: result.assets[0].uri, type, folderId: folder!.id });
    if (!isWeb) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  async function ensureLibraryPermission(): Promise<boolean> {
    if (isWeb) return true;
    if (libraryPermission?.granted) return true;
    if (libraryPermission && !libraryPermission.canAskAgain) {
      Alert.alert('Photo access needed', 'Enable photo library access in Settings to add media.');
      return false;
    }
    const result = await requestLibraryPermission();
    return result.granted;
  }

  async function handlePickFromGallery() {
    const granted = await ensureLibraryPermission();
    if (!granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: !isWeb,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.length) return;
    setProgress(result.assets.length > 1 ? 'Adding media…' : null);
    try {
      for (const asset of result.assets) {
        const type = asset.type === 'video' ? 'video' : 'photo';
        await captureMedia({ uri: asset.uri, type, folderId: folder!.id });
      }
      if (!isWeb) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } finally {
      setProgress(null);
    }
  }

  function toggleSelected(itemId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  async function handleConvertToPdf() {
    if (selectedPhotos.length === 0) return;
    try {
      setProgress('Generating PDF…');
      const sources = selectedPhotos.map((item) => ({ item, uri: getItemUri(item) }));
      const result = await generatePdfFromItems(folder!.name, sources);
      setProgress(null);
      exitSelectMode();
      if (!isWeb) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (result.webDownloaded) {
        return;
      }
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri, {
          mimeType: 'application/pdf',
          dialogTitle: `${folder!.name}.pdf`,
        });
      } else {
        Alert.alert('PDF saved', `Saved to ${result.uri}`);
      }
    } catch (err) {
      setProgress(null);
      Alert.alert('Could not create PDF', err instanceof Error ? err.message : 'Please try again.');
    }
  }

  async function handleZipAndShare() {
    if (items.length === 0) {
      Alert.alert('Folder is empty', 'Add photos or videos before sharing.');
      return;
    }
    try {
      setProgress('Compressing folder…');
      const result = await zipFolder(folder!, items);
      setProgress(null);
      if (!isWeb) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (result.webDownloaded) {
        return;
      }
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri, {
          mimeType: 'application/zip',
          dialogTitle: `${folder!.name}.zip`,
        });
      } else {
        Alert.alert('ZIP saved', `Saved to ${result.uri}`);
      }
    } catch (err) {
      setProgress(null);
      Alert.alert('Could not create ZIP', err instanceof Error ? err.message : 'Please try again.');
    }
  }

  const addOptions: ActionMenuOption[] = [
    { key: 'photo', label: 'Take Photo', icon: 'camera', onPress: () => handleCapture('photo') },
    { key: 'video', label: 'Record Video', icon: 'video', onPress: () => handleCapture('video') },
    { key: 'gallery', label: 'Choose from Gallery', icon: 'image', onPress: handlePickFromGallery },
  ];

  const folderOptions: ActionMenuOption[] = [
    { key: 'rename', label: 'Rename Folder', icon: 'edit-2', onPress: () => setRenameFolderVisible(true) },
    {
      key: 'delete',
      label: 'Delete Folder',
      icon: 'trash-2',
      destructive: true,
      onPress: () =>
        Alert.alert('Delete folder?', `"${folder!.name}" and everything inside it will be permanently deleted.`, [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              deleteFolder(folder!.id);
              router.back();
            },
          },
        ]),
    },
  ];

  const itemOptions: ActionMenuOption[] = itemMenuTarget
    ? [
        { key: 'rename', label: 'Rename', icon: 'edit-2', onPress: () => setRenameItemTarget(itemMenuTarget) },
        {
          key: 'delete',
          label: 'Delete',
          icon: 'trash-2',
          destructive: true,
          onPress: () =>
            Alert.alert('Delete item?', `"${itemMenuTarget.displayName}" will be permanently deleted.`, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => deleteItem(itemMenuTarget.id) },
            ]),
        },
      ]
    : [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
          <Feather name="chevron-left" size={26} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text numberOfLines={1} style={[styles.title, { color: colors.foreground }]}>
            {folder.name}
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable onPress={() => setAddMenuVisible(true)} hitSlop={10} style={styles.headerButton}>
            <Feather name="camera" size={20} color={colors.foreground} />
          </Pressable>
          <Pressable onPress={() => setFolderMenuVisible(true)} hitSlop={10} style={styles.headerButton}>
            <Feather name="more-vertical" size={20} color={colors.foreground} />
          </Pressable>
        </View>
      </View>

      {items.length === 0 ? (
        <EmptyState
          icon="image"
          title="No media yet"
          message="Capture a photo or video to fill this folder."
          actionLabel="Add media"
          onAction={() => setAddMenuVisible(true)}
        />
      ) : (
        <FlatList
          data={items}
          key="grid-3"
          numColumns={3}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 160 }]}
          columnWrapperStyle={styles.gridRow}
          renderItem={({ item }) => (
            <MediaThumb
              item={item}
              uri={getItemUri(item)}
              selectable={selectMode && item.type === 'photo'}
              selected={selectedIds.has(item.id)}
              onPress={() => {
                if (selectMode) {
                  if (item.type === 'photo') toggleSelected(item.id);
                } else {
                  setSelectMode(true);
                  if (item.type === 'photo') toggleSelected(item.id);
                }
              }}
              onLongPress={() => setItemMenuTarget(item)}
            />
          )}
        />
      )}

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        {selectMode ? (
          <View style={[styles.selectionBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Pressable onPress={exitSelectMode} hitSlop={8}>
              <Text style={[styles.selectionCancel, { color: colors.mutedForeground }]}>Cancel</Text>
            </Pressable>
            <Text style={[styles.selectionCount, { color: colors.foreground }]}>
              {selectedPhotos.length} selected
            </Text>
            <Pressable
              disabled={selectedPhotos.length === 0}
              onPress={handleConvertToPdf}
              style={({ pressed }) => [
                styles.pdfButton,
                {
                  backgroundColor: colors.primary,
                  opacity: selectedPhotos.length === 0 ? 0.5 : pressed ? 0.85 : 1,
                },
              ]}
            >
              <Feather name="file-text" size={16} color={colors.primaryForeground} />
              <Text style={[styles.pdfButtonLabel, { color: colors.primaryForeground }]}>
                Convert to PDF
              </Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={handleZipAndShare}
            style={({ pressed }) => [
              styles.zipButton,
              { backgroundColor: colors.accent, opacity: pressed ? 0.88 : 1 },
            ]}
          >
            <Feather name="share-2" size={18} color={colors.accentForeground} />
            <Text style={[styles.zipButtonLabel, { color: colors.accentForeground }]}>
              Zip &amp; Share
            </Text>
          </Pressable>
        )}
      </View>

      <ActionMenu
        visible={addMenuVisible}
        title="Add media"
        options={addOptions}
        onClose={() => setAddMenuVisible(false)}
      />
      <ActionMenu
        visible={folderMenuVisible}
        title={folder.name}
        options={folderOptions}
        onClose={() => setFolderMenuVisible(false)}
      />
      <ActionMenu
        visible={!!itemMenuTarget}
        title={itemMenuTarget?.displayName}
        options={itemOptions}
        onClose={() => setItemMenuTarget(null)}
      />

      <PromptModal
        visible={renameFolderVisible}
        title="Rename folder"
        initialValue={folder.name}
        confirmLabel="Save"
        onCancel={() => setRenameFolderVisible(false)}
        onConfirm={(name) => {
          renameFolder(folder!.id, name);
          setRenameFolderVisible(false);
        }}
      />
      <PromptModal
        visible={!!renameItemTarget}
        title="Rename"
        initialValue={renameItemTarget?.displayName}
        confirmLabel="Save"
        onCancel={() => setRenameItemTarget(null)}
        onConfirm={(name) => {
          if (renameItemTarget) renameItem(renameItemTarget.id, name);
          setRenameItemTarget(null);
        }}
      />

      <ProgressOverlay visible={!!progress} label={progress ?? ''} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 14,
    gap: 4,
  },
  backButton: {
    padding: 6,
  },
  headerTitleWrap: {
    flex: 1,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 4,
  },
  headerButton: {
    padding: 8,
  },
  grid: {
    paddingHorizontal: 12,
    paddingTop: 4,
    gap: 8,
  },
  gridRow: {
    gap: 8,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  selectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 10,
  },
  selectionCancel: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  selectionCount: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
  },
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  pdfButtonLabel: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
  },
  zipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 15,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  zipButtonLabel: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
  },
});
