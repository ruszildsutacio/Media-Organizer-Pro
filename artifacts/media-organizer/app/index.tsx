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
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActionMenu, type ActionMenuOption } from '@/components/ActionMenu';
import { EmptyState } from '@/components/EmptyState';
import { FolderCard } from '@/components/FolderCard';
import { ProgressOverlay } from '@/components/ProgressOverlay';
import { PromptModal } from '@/components/PromptModal';
import { useMediaLibrary } from '@/context/MediaLibraryContext';
import { useColors } from '@/hooks/useColors';
import type { MediaFolder } from '@/types/media';

const isWeb = Platform.OS === 'web';

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    ready,
    folders,
    getItemsForFolder,
    getFolderCover,
    getItemUri,
    createFolder,
    renameFolder,
    deleteFolder,
    captureMedia,
    ensureLatestFolder,
  } = useMediaLibrary();

  const [fabMenuVisible, setFabMenuVisible] = useState(false);
  const [folderMenuTarget, setFolderMenuTarget] = useState<MediaFolder | null>(null);
  const [createVisible, setCreateVisible] = useState(false);
  const [renameTarget, setRenameTarget] = useState<MediaFolder | null>(null);

  const [cameraPermission, requestCameraPermission] = ImagePicker.useCameraPermissions();
  const [libraryPermission, requestLibraryPermission] = ImagePicker.useMediaLibraryPermissions();
  const [galleryProgress, setGalleryProgress] = useState(false);

  const sortedFolders = useMemo(
    () => [...folders].sort((a, b) => b.createdAt - a.createdAt),
    [folders],
  );

  async function ensureCameraPermission(): Promise<boolean> {
    if (cameraPermission?.granted) return true;
    if (cameraPermission && !cameraPermission.canAskAgain) {
      Alert.alert(
        'Camera access needed',
        'Enable camera access in Settings to capture photos and videos.',
      );
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

    await captureMedia({ uri: result.assets[0].uri, type });
    if (!isWeb) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
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
    setGalleryProgress(true);
    try {
      for (const asset of result.assets) {
        const type = asset.type === 'video' ? 'video' : 'photo';
        await captureMedia({ uri: asset.uri, type });
      }
      if (!isWeb) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } finally {
      setGalleryProgress(false);
    }
  }

  async function handleQuickCapture() {
    const granted = await ensureCameraPermission();
    if (!granted) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;

    // Save directly into the most recently created folder (creating a
    // default folder first if none exist yet), rather than a dated folder.
    const targetFolder = ensureLatestFolder();
    await captureMedia({ uri: result.assets[0].uri, type: 'photo', folderId: targetFolder.id });
    if (!isWeb) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }

  const fabOptions: ActionMenuOption[] = [
    { key: 'photo', label: 'Take Photo', icon: 'camera', onPress: () => handleCapture('photo') },
    { key: 'video', label: 'Record Video', icon: 'video', onPress: () => handleCapture('video') },
    { key: 'gallery', label: 'Choose from Gallery', icon: 'image', onPress: handlePickFromGallery },
    {
      key: 'folder',
      label: 'Create New Folder',
      icon: 'folder-plus',
      onPress: () => setCreateVisible(true),
    },
  ];

  const folderMenuOptions: ActionMenuOption[] = folderMenuTarget
    ? [
        {
          key: 'rename',
          label: 'Rename Folder',
          icon: 'edit-2',
          onPress: () => setRenameTarget(folderMenuTarget),
        },
        {
          key: 'delete',
          label: 'Delete Folder',
          icon: 'trash-2',
          destructive: true,
          onPress: () =>
            Alert.alert(
              'Delete folder?',
              `"${folderMenuTarget.name}" and everything inside it will be permanently deleted.`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => deleteFolder(folderMenuTarget.id),
                },
              ],
            ),
        },
      ]
    : [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>Snapfolio</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {folders.length} {folders.length === 1 ? 'folder' : 'folders'}
            </Text>
          </View>

          <Pressable
            onPress={handleQuickCapture}
            style={({ pressed }) => [
              styles.quickCaptureButton,
              { backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1 },
            ]}
          >
            <Feather name="camera" size={18} color={colors.primaryForeground} />
            <Text style={[styles.quickCaptureLabel, { color: colors.primaryForeground }]}>
              Take Picture
            </Text>
          </Pressable>
        </View>
      </View>

      {!ready ? null : sortedFolders.length === 0 ? (
        <EmptyState
          icon="folder"
          title="No folders yet"
          message="Capture a photo or video and it will land in an auto-dated folder — or start one yourself."
          actionLabel="Create a folder"
          onAction={() => setCreateVisible(true)}
        />
      ) : (
        <FlatList
          data={sortedFolders}
          key="grid-2"
          numColumns={2}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 120 }]}
          columnWrapperStyle={styles.gridRow}
          renderItem={({ item }) => {
            const cover = getFolderCover(item.id);
            return (
              <FolderCard
                folder={item}
                itemCount={getItemsForFolder(item.id).length}
                cover={cover}
                coverUri={cover ? getItemUri(cover) : undefined}
                onPress={() => router.push(`/folder/${item.id}`)}
                onLongPress={() => setFolderMenuTarget(item)}
              />
            );
          }}
        />
      )}

      <Pressable
        onPress={() => setFabMenuVisible(true)}
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: colors.primary,
            bottom: insets.bottom + 24,
            transform: [{ scale: pressed ? 0.94 : 1 }],
          },
        ]}
      >
        <Feather name="plus" size={26} color={colors.primaryForeground} />
      </Pressable>

      <ActionMenu
        visible={fabMenuVisible}
        title="Add to Snapfolio"
        options={fabOptions}
        onClose={() => setFabMenuVisible(false)}
      />

      <ActionMenu
        visible={!!folderMenuTarget}
        title={folderMenuTarget?.name}
        options={folderMenuOptions}
        onClose={() => setFolderMenuTarget(null)}
      />

      <PromptModal
        visible={createVisible}
        title="New folder"
        placeholder="Folder name"
        confirmLabel="Create"
        onCancel={() => setCreateVisible(false)}
        onConfirm={(name) => {
          setCreateVisible(false);
          createFolder(name);
        }}
      />

      <PromptModal
        visible={!!renameTarget}
        title="Rename folder"
        placeholder="Folder name"
        initialValue={renameTarget?.name}
        confirmLabel="Save"
        onCancel={() => setRenameTarget(null)}
        onConfirm={(name) => {
          if (renameTarget) renameFolder(renameTarget.id, name);
          setRenameTarget(null);
        }}
      />

      <ProgressOverlay visible={galleryProgress} label="Adding media…" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  quickCaptureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  quickCaptureLabel: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  grid: {
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 12,
  },
  gridRow: {
    gap: 12,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
