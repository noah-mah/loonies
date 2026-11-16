import { useEffect, useState } from 'react';
import type { KeyboardEvent } from 'react';

import { css } from '@actual-app/components/css';

import { AccountGroupHeader } from './AccountGroupHeader';
import { AccountRow } from './AccountRow';
import { SidebarTreeContext } from './sidebarTreeContext';
import type { DropPlacement, DropPosition } from './sidebarTreeContext';
import { TreeItemEditingContext } from './treeItemEditing';
import { parseTreeKey, treeKeys } from './treeKeys';
import { useAccountTreeDragAndDrop } from './useAccountTreeDragAndDrop';
import type { AccountTreeSide } from './useAccountTreeDragAndDrop';
import type { GroupBucket } from './useSidebarAccountTree';

type AccountTreeProps = {
  label: string;
  side: AccountTreeSide;
  buckets: GroupBucket[];
  showSyncDot: boolean;
  isDragDisabled: boolean;
  isBucketOpen?: (bucket: GroupBucket) => boolean;
  onToggleBucket?: (bucket: GroupBucket) => void;
};

export function AccountTree({
  label,
  side,
  buckets,
  showSyncDot,
  isDragDisabled,
  isBucketOpen,
  onToggleBucket,
}: AccountTreeProps) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const [dropPlacement, setDropPlacement] = useState<DropPlacement | null>(
    null,
  );

  const groupBuckets = buckets.filter(bucket => bucket.group != null);
  const expanded = new Set<string>(
    groupBuckets
      .filter(bucket => isBucketOpen?.(bucket) ?? true)
      .map(bucket => treeKeys.group(bucket.group?.id ?? '')),
  );
  const parents = new Map<string, string>();
  for (const bucket of groupBuckets) {
    const parent = treeKeys.group(bucket.group?.id ?? '');
    for (const account of bucket.accounts) {
      parents.set(treeKeys.account(account.id), parent);
    }
  }

  const drag = useAccountTreeDragAndDrop({
    buckets,
    isDisabled: isDragDisabled,
    expandedKeys: expanded,
  });
  const visibleKeys = drag.visibleKeys;

  function focusKey(key: string) {
    setFocusedKey(key);
  }

  useEffect(() => {
    if (focusedKey == null || editingKey != null) return;
    const element = document.querySelector<HTMLElement>(
      `[data-tree-key="${CSS.escape(focusedKey)}"]`,
    );
    if (
      element != null &&
      (document.activeElement == null ||
        !element.contains(document.activeElement))
    ) {
      element.focus();
    }
  }, [editingKey, focusedKey]);

  const toggleKey = (key: string) => {
    const bucket = groupBuckets.find(
      item => treeKeys.group(item.group?.id ?? '') === key,
    );
    if (bucket != null) onToggleBucket?.(bucket);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (editingKey != null) return;
    if (
      event.target instanceof HTMLElement &&
      (event.target.closest('input, textarea') != null ||
        event.target.dataset.dragHandle != null)
    ) {
      return;
    }
    const current = focusedKey ?? visibleKeys[0] ?? null;
    if (current == null) return;
    const index = visibleKeys.indexOf(current);
    const node = parseTreeKey(current);

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      const next =
        visibleKeys[event.key === 'ArrowDown' ? index + 1 : index - 1];
      if (next != null) focusKey(next);
      event.preventDefault();
      return;
    }
    if (event.key === 'Home') {
      const first = visibleKeys[0];
      if (first != null) focusKey(first);
      event.preventDefault();
      return;
    }
    if (event.key === 'End') {
      const last = visibleKeys.at(-1);
      if (last != null) focusKey(last);
      event.preventDefault();
      return;
    }
    if (event.key === 'ArrowRight' && node?.kind === 'group') {
      if (!expanded.has(current)) {
        toggleKey(current);
      } else {
        const child = visibleKeys[index + 1];
        if (child != null && parseTreeKey(child)?.kind === 'account') {
          focusKey(child);
        }
      }
      event.preventDefault();
      return;
    }
    if (event.key === 'ArrowLeft') {
      if (node?.kind === 'group' && expanded.has(current)) {
        toggleKey(current);
      } else {
        const parent = parents.get(current);
        if (parent != null) focusKey(parent);
      }
      event.preventDefault();
      return;
    }
    if (
      (event.key === 'Enter' || event.key === ' ') &&
      node?.kind === 'group'
    ) {
      toggleKey(current);
      event.preventDefault();
    }
  };

  return (
    <TreeItemEditingContext.Provider value={{ editingKey, setEditingKey }}>
      <SidebarTreeContext.Provider
        value={{
          focusedKey: focusedKey ?? visibleKeys[0] ?? null,
          focusKey,
          isDragDisabled,
          draggingKey: drag.draggingKey,
          dropPlacement,
          setDropPlacement,
          beginDrag: drag.beginDrag,
          endDrag: () => {
            setDropPlacement(null);
            drag.endDrag();
          },
          canDrop: drag.canDrop,
          completeDrop: (key, position: DropPosition) => {
            setDropPlacement(null);
            drag.completeDrop(key, position);
          },
          moveWithKeyboard: drag.moveWithKeyboard,
          hoverKey: drag.hoverKey,
          isExpanded: key => expanded.has(key) && !drag.isDraggingGroup,
          parentKey: key => parents.get(key) ?? null,
          toggleKey,
        }}
      >
        <div
          role="tree"
          aria-label={label}
          tabIndex={-1}
          className={css({ outline: 'none' })}
          onKeyDown={onKeyDown}
        >
          {buckets.map(bucket =>
            bucket.group == null ? (
              bucket.accounts.map(account => (
                <AccountRow
                  key={treeKeys.account(account.id)}
                  account={account}
                  isClosed={side === 'closed'}
                  showSyncDot={showSyncDot}
                  level={1}
                />
              ))
            ) : (
              <AccountGroupHeader
                key={treeKeys.group(bucket.group.id)}
                group={bucket.group}
                side={side === 'off' ? 'off' : 'on'}
                accounts={bucket.accounts}
                failedCount={bucket.failedCount}
                showSyncDot={showSyncDot}
                isDropZoneActive={drag.isGroupDropZoneActive(bucket.group.id)}
              />
            ),
          )}
        </div>
      </SidebarTreeContext.Provider>
    </TreeItemEditingContext.Provider>
  );
}
