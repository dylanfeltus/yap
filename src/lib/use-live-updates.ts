"use client";

import { useEffect, useRef } from "react";

let sharedSource: EventSource | null = null;
let refCount = 0;
const channelListeners = new Map<string, Set<() => void>>();

function getSource(): EventSource {
  if (!sharedSource || sharedSource.readyState === EventSource.CLOSED) {
    sharedSource = new EventSource("/api/events");
    sharedSource.onmessage = (event) => {
      try {
        const { channel } = JSON.parse(event.data);
        const listeners = channelListeners.get(channel);
        if (listeners) {
          for (const cb of listeners) {
            cb();
          }
        }
      } catch {
        // Ignore malformed messages
      }
    };
  }
  return sharedSource;
}

function releaseSource() {
  if (refCount <= 0 && sharedSource) {
    sharedSource.close();
    sharedSource = null;
  }
}

export function useLiveUpdates(channel: string, onUpdate: () => void): void {
  const callbackRef = useRef(onUpdate);
  callbackRef.current = onUpdate;

  useEffect(() => {
    refCount++;
    getSource();

    const handler = () => callbackRef.current();

    if (!channelListeners.has(channel)) {
      channelListeners.set(channel, new Set());
    }
    channelListeners.get(channel)!.add(handler);

    return () => {
      channelListeners.get(channel)?.delete(handler);
      if (channelListeners.get(channel)?.size === 0) {
        channelListeners.delete(channel);
      }
      refCount--;
      if (refCount <= 0) {
        releaseSource();
      }
    };
  }, [channel]);
}
