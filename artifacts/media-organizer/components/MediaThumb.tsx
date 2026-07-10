import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useColors } from '@/hooks/useColors';
import type { MediaItem } from '@/types/media';

interface MediaThumbProps {
  item: MediaItem;
  uri: string;
  selectable: boolean;
  selected: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

export function MediaThumb({ item, uri, selectable, selected, onPress, onLongPress }: MediaThumbProps) {
  const colors = useColors();
  const isVideo = item.type === 'video';

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: colors.muted, borderRadius: 12, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      {isVideo ? (
        <View style={[styles.videoPlaceholder, { backgroundColor: colors.secondary }]}>
          <Feather name="film" size={26} color={colors.mutedForeground} />
        </View>
      ) : (
        <Image source={{ uri }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
      )}

      {isVideo ? (
        <View style={[styles.videoBadge, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
          <Feather name="play" size={11} color="#ffffff" />
        </View>
      ) : null}

      <Text numberOfLines={1} style={[styles.label, { color: '#ffffff' }]}>
        {item.displayName}
      </Text>

      {selectable ? (
        <View
          style={[
            styles.checkbox,
            {
              backgroundColor: selected ? colors.primary : 'rgba(0,0,0,0.35)',
              borderColor: selected ? colors.primary : 'rgba(255,255,255,0.8)',
            },
          ]}
        >
          {selected ? <Feather name="check" size={13} color={colors.primaryForeground} /> : null}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    aspectRatio: 1,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  videoPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    paddingHorizontal: 6,
    paddingBottom: 5,
    paddingTop: 14,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  checkbox: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
