import { createContext, useContext, useEffect, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { css, cx } from '@actual-app/components/css';
import { SvgMenu } from '@actual-app/components/icons/v1';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { radius } from '@actual-app/components/tokens';

import { DropHighlight, useDraggable, useDroppable } from '#components/sort';
import type { DropPosition } from '#components/sort';
import { useDragRef } from '#hooks/useDragRef';
import { useMergedRefs } from '#hooks/useMergedRefs';

type MoveHandler = (
  draggedId: string,
  targetId: string,
  position: DropPosition,
) => void;

type ReorderContextValue = {
  dragType: string;
  itemIds: string[];
  onMove: MoveHandler;
  navigation: 'arrow' | 'none';
  focusedId: string | null;
  focusId: (id: string) => void;
};

const ReorderContext = createContext<ReorderContextValue | null>(null);
const DragConnectorContext = createContext<
  ((element: HTMLDivElement | null) => void) | null
>(null);

function useReorderContext() {
  const context = useContext(ReorderContext);
  if (context == null) {
    throw new Error(
      'Reorderable items must be rendered inside ReorderableList',
    );
  }
  return context;
}

type ReorderableListProps = {
  label: string;
  dragType: string;
  itemIds: string[];
  onMove: MoveHandler;
  navigation?: 'arrow' | 'none';
  className?: string;
  children: ReactNode;
};

export function ReorderableList({
  label,
  dragType,
  itemIds,
  onMove,
  navigation = 'arrow',
  className,
  children,
}: ReorderableListProps) {
  const [focusedId, setFocusedId] = useState<string | null>(null);

  useEffect(() => {
    if (navigation !== 'arrow' || focusedId == null) return;
    const element = document.querySelector<HTMLElement>(
      `[data-reorder-item="${CSS.escape(focusedId)}"]`,
    );
    if (
      element != null &&
      (document.activeElement == null ||
        !element.contains(document.activeElement))
    ) {
      element.focus();
    }
  }, [focusedId, navigation]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (navigation !== 'arrow') return;
    if (
      event.target instanceof HTMLElement &&
      event.target.closest(
        'input, textarea, select, button, [data-reorder-handle]',
      )
    ) {
      return;
    }
    const current = focusedId ?? itemIds[0] ?? null;
    if (current == null) return;
    const index = itemIds.indexOf(current);
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      const next = itemIds[event.key === 'ArrowDown' ? index + 1 : index - 1];
      if (next != null) setFocusedId(next);
      event.preventDefault();
    }
    if (event.key === 'Home' && itemIds[0] != null) {
      setFocusedId(itemIds[0]);
      event.preventDefault();
    }
    if (event.key === 'End') {
      const last = itemIds.at(-1);
      if (last != null) setFocusedId(last);
      event.preventDefault();
    }
  };

  return (
    <ReorderContext.Provider
      value={{
        dragType,
        itemIds,
        onMove,
        navigation,
        focusedId: focusedId ?? itemIds[0] ?? null,
        focusId: setFocusedId,
      }}
    >
      <div
        role="list"
        aria-label={label}
        tabIndex={-1}
        className={className}
        onKeyDown={onKeyDown}
      >
        {children}
      </div>
    </ReorderContext.Provider>
  );
}

type ReorderableItemProps = {
  id: string;
  textValue: string;
  className?: string;
  testId?: string;
  dragOn?: 'row' | 'handle';
  children: ReactNode;
};

export function ReorderableItem({
  id,
  textValue,
  className,
  testId,
  dragOn = 'row',
  children,
}: ReorderableItemProps) {
  const reorder = useReorderContext();
  const { dragRef, isDragging } = useDraggable({
    type: reorder.dragType,
    item: { id },
    canDrag: true,
    onDragChange: () => undefined,
  });
  const { dropRef, dropPos } = useDroppable({
    types: reorder.dragType,
    id,
    onDrop: (draggedId, position, targetId) => {
      if (position == null || draggedId === targetId) return;
      reorder.onMove(draggedId, targetId, position);
    },
  });
  const connectDrag = useDragRef(dragRef);
  const ref = useMergedRefs<HTMLDivElement>(
    dragOn === 'row' ? connectDrag : null,
    dropRef,
  );
  const isFocused = reorder.focusedId === id;

  return (
    <DragConnectorContext.Provider
      value={dragOn === 'handle' ? connectDrag : null}
    >
      <div
        ref={ref}
        role="listitem"
        aria-label={textValue}
        data-reorder-item={id}
        data-testid={testId}
        data-dragging={isDragging || undefined}
        tabIndex={reorder.navigation === 'arrow' && isFocused ? 0 : -1}
        className={cx(
          css({
            position: 'relative',
            outline: 'none',
            '&[data-dragging]': { opacity: 0.5 },
          }),
          className,
        )}
        onFocus={() => reorder.focusId(id)}
      >
        <DropHighlight pos={dropPos} />
        {children}
      </div>
    </DragConnectorContext.Provider>
  );
}

type ReorderHandleProps = {
  itemId: string;
  label: string;
  hidden?: boolean;
};

export function ReorderHandle({ itemId, label, hidden }: ReorderHandleProps) {
  const { t } = useTranslation();
  const reorder = useReorderContext();
  const connectDrag = useContext(DragConnectorContext);

  const move = (direction: 'up' | 'down') => {
    const index = reorder.itemIds.indexOf(itemId);
    const neighbor =
      reorder.itemIds[direction === 'up' ? index - 1 : index + 1];
    if (neighbor == null) return;
    reorder.onMove(itemId, neighbor, direction === 'up' ? 'top' : 'bottom');
  };

  return (
    <div
      role="button"
      tabIndex={0}
      ref={connectDrag ?? undefined}
      data-reorder-handle=""
      aria-label={label || t('Reorder')}
      className={
        hidden
          ? css({
              ...styles.visuallyHidden,
              pointerEvents: 'none',
              '&:focus-visible': {
                position: 'static',
                width: 'auto',
                height: 'auto',
                margin: 0,
                overflow: 'visible',
                clip: 'auto',
                display: 'flex',
                alignItems: 'center',
                border: 'none',
                background: 'none',
                color: 'inherit',
                borderRadius: radius.sm,
                outline: `2px solid ${theme.formInputBorderSelected}`,
                outlineOffset: 1,
              },
            })
          : css({
              display: 'flex',
              alignItems: 'center',
              padding: 4,
              border: 'none',
              background: 'none',
              color: theme.pageTextSubdued,
              cursor: 'grab',
              '&:focus-visible': {
                outline: `2px solid ${theme.formInputBorderSelected}`,
                borderRadius: radius.sm,
              },
            })
      }
      onKeyDown={event => {
        if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
        event.preventDefault();
        event.stopPropagation();
        move(event.key === 'ArrowUp' ? 'up' : 'down');
      }}
    >
      <SvgMenu style={{ width: hidden ? 10 : 12, height: hidden ? 10 : 12 }} />
    </div>
  );
}
