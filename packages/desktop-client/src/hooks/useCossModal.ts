import { useEffect } from 'react';
import { useHotkeysContext } from 'react-hotkeys-hook';

import { useModalState } from '#hooks/useModalState';
import type { Modal } from '#modals/modalsSlice';

export function useCossModal(name: Modal['name'], onDismiss?: () => void) {
  const { enableScope, disableScope } = useHotkeysContext();
  const { isActive, isHidden, onClose } = useModalState();
  const open = isActive(name) && !isHidden;

  useEffect(() => {
    enableScope(name);
    return () => {
      disableScope(name);
    };
  }, [disableScope, enableScope, name]);

  const close = () => {
    onDismiss?.();
    onClose();
  };

  const onOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && open) {
      close();
    }
  };

  return { close, onOpenChange, open };
}
