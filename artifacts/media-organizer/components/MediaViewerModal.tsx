import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MediaItem } from '@/types/media';

interface MediaViewerModalProps {
  item: MediaItem | null;
  uri: string | null;
  onClose: () => void;
}

/**
 * Full-screen preview overlay opened by tapping a thumbnail in the folder
 * grid. Photos render full-size in a simple, interactive <Image>; videos
 * play using expo-video with native playback controls.
 */
export function MediaViewerModal({ item, uri, onClose }: MediaViewerModalProps) {
  const insets = useSafeAreaInsets();
  const isVideo = item?.type === 'video';

  return (
    <Modal visible={!!item && !!uri} animationType="fade" onRequestClose={onClose}>
      <View style={styles.container}>
        {item && uri ? (
          isVideo ? (
            <VideoPlayerView uri={uri} />
          ) : (
            <Image source={{ uri }} style={styles.image} contentFit="contain" />
          )
        ) : null}

        <Pressable
          onPress={onClose}
          hitSlop={12}
          style={[styles.closeButton, { top: insets.top + 12 }]}
        >
          <Feather name="x" size={22} color="#ffffff" />
        </Pressable>
      </View>
    </Modal>
  );
}

function VideoPlayerView({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.play();
  });

  return (
    <VideoView
      player={player}
      style={styles.video}
      contentFit="contain"
      nativeControls
      allowsFullscreen
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
});
