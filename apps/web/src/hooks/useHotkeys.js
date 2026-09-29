/**
 * useHotkeys Hook
 * Global hotkey support for the interview copilot.
 */

import { useEffect, useCallback } from 'react';

export function useHotkeys(keyMap) {
  const handleKeyDown = useCallback(
    (event) => {
      const key = [];
      if (event.ctrlKey) key.push('Ctrl');
      if (event.shiftKey) key.push('Shift');
      if (event.altKey) key.push('Alt');
      if (event.key && event.key.length === 1) {
        key.push(event.key.toUpperCase());
      } else if (event.key) {
        key.push(event.key);
      }

      const combo = key.join('+');

      for (const [hotkey, handler] of Object.entries(keyMap)) {
        if (combo === hotkey) {
          event.preventDefault();
          handler();
          return;
        }
      }
    },
    [keyMap]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export default useHotkeys;
