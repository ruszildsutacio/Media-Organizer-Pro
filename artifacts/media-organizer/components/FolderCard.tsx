import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useColors } from '@/hooks/useColors';
import type { MediaFolder, MediaItem } from '@/types/media';

interface FolderCardProps {
  folder: MediaFolder;
  itemCount: number;
  cover?: MediaItem;
  coverUri?: string;
  onPress: () => void;
  onLongPress: () => void;
}

export function FolderCard({ folder, itemCount, cover, coverUri, onPress, onLongPress }: FolderCardProps) {
  const colors = useColors();

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: colors.card,
          borderRadius: colors.radius,
          borderColor: colors.border,
          opacity: pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      <View style={[styles.cover, { backgroundColor: colors.muted }]}>
        {cover && cover.type === 'photo' && coverUri ? (
          <Image source={{ uri: coverUri }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
        ) : (
          <Feather
            name={cover?.type === 'video' ? 'video' : 'folder'}
            size={28}
            color={colors.mutedForeground}
          />
        )}
        {cover?.type === 'video' ? (
          <View style={[styles.videoBadge, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
            <Feather name="play" size={12} color="#ffffff" />
          </View>
        ) : null}
      </View>
      <Text numberOfLines={1} style={[styles.name, { color: colors.foreground }]}>
        {folder.name}
      </Text>
      <Text style={[styles.count, { color: colors.mutedForeground }]}>
        {itemCount} {itemCount === 1 ? 'item' : 'items'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
    gap: 8,
  },
  cover: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  videoBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
  },
  count: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
});
