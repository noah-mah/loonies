import { useRef } from 'react';
import type { DragEvent } from 'react';

import { theme } from '@actual-app/components/theme';

import type { DropPosition } from './sidebarTreeContext';
import { useSidebarTree } from './sidebarTreeContext';
import { parseTreeKey } from './treeKeys';

function positionFor(key: string, ratio: number): DropPosition {
  if (parseTreeKey(key)?.kind !== 'group') {
    return ratio < 0.5 ? 'before' : 'after';
  }
  if (ratio < 0.28) return 'before';
  if (ratio > 0.72) return 'after';
  return 'on';
}

export function useTreeDropTarget(key: string) {
  const tree = useSidebarTree();
  const placement =
    tree.dropPlacement?.key === key ? tree.dropPlacement.position : null;

  const onDragOver = (event: DragEvent<HTMLElement>) => {
    if (tree.draggingKey == null) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio =
      rect.height === 0 ? 0.5 : (event.clientY - rect.top) / rect.height;
    const position = positionFor(key, ratio);
    if (!tree.canDrop(key, position)) {
      if (tree.dropPlacement?.key === key) tree.setDropPlacement(null);
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
    tree.setDropPlacement({ key, position });
    tree.hoverKey(key);
  };

  const onDrop = (event: DragEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio =
      rect.height === 0 ? 0.5 : (event.clientY - rect.top) / rect.height;
    const position = positionFor(key, ratio);
    if (!tree.canDrop(key, position)) return;
    event.preventDefault();
    event.stopPropagation();
    tree.completeDrop(key, position);
  };

  const onDragLeave = (event: DragEvent<HTMLElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }
    if (tree.dropPlacement?.key === key) tree.setDropPlacement(null);
  };

  const indicatorStyle =
    placement === 'before'
      ? { boxShadow: `inset 0 3px 0 ${theme.pageTextLink}` }
      : placement === 'after'
        ? { boxShadow: `inset 0 -3px 0 ${theme.pageTextLink}` }
        : undefined;

  return { onDragOver, onDrop, onDragLeave, placement, indicatorStyle };
}

export function useRowDrag(key: string) {
  const tree = useSidebarTree();
  const didDrag = useRef(false);

  const onDragStart = (event: DragEvent<HTMLElement>) => {
    if (tree.isDragDisabled) {
      event.preventDefault();
      return;
    }
    didDrag.current = true;
    event.dataTransfer.setData('text/plain', key);
    event.dataTransfer.effectAllowed = 'move';
    event.stopPropagation();
    tree.beginDrag(key);
  };

  const onDragEnd = () => {
    tree.endDrag();
    window.setTimeout(() => {
      didDrag.current = false;
    }, 0);
  };

  const shouldIgnoreClick = () => {
    if (!didDrag.current) return false;
    didDrag.current = false;
    return true;
  };

  return {
    draggable: !tree.isDragDisabled,
    onDragStart,
    onDragEnd,
    shouldIgnoreClick,
  };
}
