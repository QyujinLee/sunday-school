'use client';

import { useCallback, useSyncExternalStore } from 'react';

type ToggleState = 'expanded' | 'collapsed';

type UsePersistentToggleOptions = {
  storageKey: string;
  eventName: string;
  defaultDesktopExpanded?: boolean;
};

/**
 * sessionStorage 기반 토글 상태(접힘/펼침)를 구독하고 갱신한다.
 */
export function usePersistentToggle({
  storageKey,
  eventName,
  defaultDesktopExpanded = false,
}: UsePersistentToggleOptions) {
  const getSnapshot = useCallback((): ToggleState => {
    if (typeof window === 'undefined') {
      return 'collapsed';
    }

    const storedValue = window.sessionStorage.getItem(storageKey);

    if (storedValue === 'expanded' || storedValue === 'collapsed') {
      return storedValue;
    }

    if (defaultDesktopExpanded) {
      return window.matchMedia('(min-width: 640px)').matches ? 'expanded' : 'collapsed';
    }

    return 'collapsed';
  }, [defaultDesktopExpanded, storageKey]);

  const getServerSnapshot = useCallback((): ToggleState => 'collapsed', []);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (typeof window === 'undefined') {
        return () => {};
      }

      const mediaQuery = window.matchMedia('(min-width: 640px)');

      const handleStorage = (event: StorageEvent) => {
        if (event.storageArea === window.sessionStorage && event.key === storageKey) {
          onStoreChange();
        }
      };

      const handleToggleChange = () => {
        onStoreChange();
      };

      const handleViewportChange = () => {
        if (defaultDesktopExpanded && !window.sessionStorage.getItem(storageKey)) {
          onStoreChange();
        }
      };

      window.addEventListener('storage', handleStorage);
      window.addEventListener(eventName, handleToggleChange);
      mediaQuery.addEventListener('change', handleViewportChange);

      return () => {
        window.removeEventListener('storage', handleStorage);
        window.removeEventListener(eventName, handleToggleChange);
        mediaQuery.removeEventListener('change', handleViewportChange);
      };
    },
    [defaultDesktopExpanded, eventName, storageKey],
  );

  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isExpanded = snapshot === 'expanded';

  const toggle = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const nextState: ToggleState = isExpanded ? 'collapsed' : 'expanded';
    window.sessionStorage.setItem(storageKey, nextState);
    window.dispatchEvent(new Event(eventName));
  }, [eventName, isExpanded, storageKey]);

  return {
    isExpanded,
    toggle,
  };
}
