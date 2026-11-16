import { createContext, useContext } from 'react';

export type DropPosition = 'before' | 'after' | 'on';

export type DropPlacement = {
  key: string;
  position: DropPosition;
};

type SidebarTreeContextValue = {
  focusedKey: string | null;
  focusKey: (key: string) => void;
  isDragDisabled: boolean;
  draggingKey: string | null;
  dropPlacement: DropPlacement | null;
  setDropPlacement: (placement: DropPlacement | null) => void;
  beginDrag: (key: string) => void;
  endDrag: () => void;
  canDrop: (targetKey: string, position: DropPosition) => boolean;
  completeDrop: (targetKey: string, position: DropPosition) => void;
  moveWithKeyboard: (key: string, direction: 'up' | 'down') => void;
  hoverKey: (key: string | null) => void;
  isExpanded: (key: string) => boolean;
  parentKey: (key: string) => string | null;
  toggleKey: (key: string) => void;
};

export const SidebarTreeContext = createContext<SidebarTreeContextValue | null>(
  null,
);

export function useSidebarTree() {
  const context = useContext(SidebarTreeContext);
  if (context == null) {
    throw new Error('useSidebarTree must be used within a sidebar tree');
  }
  return context;
}
