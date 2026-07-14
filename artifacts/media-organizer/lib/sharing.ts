import * as Sharing from 'expo-sharing';

// Module-level (not per-component) lock: the native share sheet is a single
// system-wide resource, so the lock must be shared across every screen that
// can trigger a share, not scoped to one component's state.
let isSharing = false;
let releaseTimeout: ReturnType<typeof setTimeout> | null = null;

export interface ShareResult {
  shared: boolean;
  /** True if this call was ignored because a share was already in flight. */
  blocked?: boolean;
}

/**
 * Safe wrapper around `Sharing.shareAsync`.
 *
 * Fixes: "call to function 'ExpoSharing.ShareAsync' has been rejected...
 * Another share request is being processed now." That native error happens
 * because the Android share sheet doesn't always resolve/reject its promise
 * promptly when the user cancels, so a second call can be rejected while the
 * first is still "in flight" from the JS side's perspective.
 *
 * - A simple lock blocks any overlapping call outright (returns
 *   `{ shared: false, blocked: true }` instead of letting the native layer
 *   throw).
 * - The lock is always released in `finally`, regardless of success, error,
 *   or user cancellation.
 * - A short timeout fallback force-clears the lock in case the native
 *   promise never settles, so the user can retry without restarting the app.
 */
export async function shareFile(
  uri: string,
  mimeType: string,
  dialogTitle: string,
): Promise<ShareResult> {
  if (isSharing) {
    return { shared: false, blocked: true };
  }

  isSharing = true;
  if (releaseTimeout) clearTimeout(releaseTimeout);
  releaseTimeout = setTimeout(() => {
    isSharing = false;
  }, 2000);

  try {
    const available = await Sharing.isAvailableAsync();
    if (!available) {
      return { shared: false };
    }
    await Sharing.shareAsync(uri, { mimeType, dialogTitle });
    return { shared: true };
  } catch (err) {
    console.warn('Share request failed or was cancelled', err);
    return { shared: false };
  } finally {
    isSharing = false;
    if (releaseTimeout) {
      clearTimeout(releaseTimeout);
      releaseTimeout = null;
    }
  }
}

export function isShareInProgress(): boolean {
  return isSharing;
}
