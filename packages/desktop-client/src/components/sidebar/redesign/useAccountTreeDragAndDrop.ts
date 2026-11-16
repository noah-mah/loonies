import { useRef, useState } from 'react';

import type {
  AccountEntity,
  AccountGroupEntity,
} from '@actual-app/core/types/models';

import { useMoveAccountGroupMutation } from '#account-groups';
import { useMoveAccountMutation } from '#accounts';
import { useAccountGroups } from '#hooks/useAccountGroups';
import { useAccounts } from '#hooks/useAccounts';

import { computeAccountMove, computeGroupMove } from './accountTreeMoves';
import type { DropPosition } from './sidebarTreeContext';
import { parseTreeKey, treeKeys } from './treeKeys';
import type { SidebarTreeNode } from './treeKeys';
import { getEffectiveGroupId } from './useSidebarAccountTree';
import type { GroupBucket } from './useSidebarAccountTree';

export type AccountTreeSide = 'on' | 'off' | 'closed';

type DraggedNode =
  | {
      kind: 'account';
      accountId: AccountEntity['id'];
      groupId: AccountGroupEntity['id'] | null;
    }
  | { kind: 'group'; groupId: AccountGroupEntity['id'] };

type UseAccountTreeDragAndDropArgs = {
  buckets: GroupBucket[];
  isDisabled: boolean;
  expandedKeys: ReadonlySet<string>;
};

function visibleKeysFor(
  buckets: GroupBucket[],
  expandedKeys: ReadonlySet<string>,
  hideChildren: boolean,
) {
  const keys: string[] = [];
  for (const bucket of buckets) {
    if (bucket.group == null) {
      for (const account of bucket.accounts) {
        keys.push(treeKeys.account(account.id));
      }
      continue;
    }
    const key = treeKeys.group(bucket.group.id);
    keys.push(key);
    if (!hideChildren && expandedKeys.has(key)) {
      for (const account of bucket.accounts) {
        keys.push(treeKeys.account(account.id));
      }
    }
  }
  return keys;
}

export function useAccountTreeDragAndDrop({
  buckets,
  isDisabled,
  expandedKeys,
}: UseAccountTreeDragAndDropArgs) {
  const { data: accounts = [] } = useAccounts();
  const { data: accountGroups = [] } = useAccountGroups();
  const moveAccount = useMoveAccountMutation();
  const moveGroup = useMoveAccountGroupMutation();
  const [dragged, setDragged] = useState<DraggedNode | null>(null);
  const [hoveredGroupId, setHoveredGroupId] = useState<
    AccountGroupEntity['id'] | null
  >(null);
  const [isDraggingGroup, setIsDraggingGroup] = useState(false);
  const collapseTimer = useRef<number | undefined>(undefined);

  const liveGroupIds = new Set(accountGroups.map(group => group.id));
  const firstRootGroupId = buckets.find(bucket => bucket.group != null)?.group
    ?.id;

  const groupOfNode = (node: SidebarTreeNode | null) => {
    if (node?.kind === 'group') {
      return node.groupId;
    }
    if (node?.kind === 'account') {
      const account = accounts.find(item => item.id === node.accountId);
      return account == null
        ? null
        : getEffectiveGroupId(account, liveGroupIds);
    }
    return null;
  };

  const nodeFromKey = (key: string): DraggedNode | null => {
    const node = parseTreeKey(key);
    if (node?.kind === 'account') {
      return { ...node, groupId: groupOfNode(node) };
    }
    return node;
  };

  const canDropNode = (
    draggedNode: DraggedNode | null,
    targetKey: string,
    position: DropPosition,
  ) => {
    if (isDisabled || draggedNode == null) return false;
    const node = parseTreeKey(targetKey);
    if (node == null) return false;
    if (draggedNode.kind === 'group') {
      return node.kind === 'group' && position !== 'on';
    }
    if (node.kind === 'account') {
      return position !== 'on';
    }
    if (position === 'on') return true;
    return position === 'before' && node.groupId === firstRootGroupId;
  };

  const performDrop = (
    draggedNode: DraggedNode,
    targetKey: string,
    position: DropPosition,
  ) => {
    const targetNode = parseTreeKey(targetKey);
    if (targetNode == null || !canDropNode(draggedNode, targetKey, position)) {
      return;
    }

    if (draggedNode.kind === 'group') {
      if (targetNode.kind !== 'group' || position === 'on') return;
      const move = computeGroupMove({
        groups: accountGroups,
        draggedId: draggedNode.groupId,
        targetId: targetNode.groupId,
        position,
      });
      if (move != null) moveGroup.mutate(move);
      return;
    }

    const move = computeAccountMove({
      accounts,
      liveGroupIds,
      draggedId: draggedNode.accountId,
      target:
        targetNode.kind === 'account'
          ? {
              kind: 'account',
              accountId: targetNode.accountId,
              position: position === 'after' ? 'after' : 'before',
            }
          : {
              kind: 'group',
              groupId: targetNode.groupId,
              position,
            },
    });
    if (move != null) moveAccount.mutate(move);
  };

  const beginDrag = (key: string) => {
    const node = nodeFromKey(key);
    setDragged(node);
    if (node?.kind === 'group') {
      collapseTimer.current = window.setTimeout(
        () => setIsDraggingGroup(true),
        0,
      );
    }
  };

  const endDrag = () => {
    window.clearTimeout(collapseTimer.current);
    setIsDraggingGroup(false);
    setDragged(null);
    setHoveredGroupId(null);
  };

  const completeDrop = (targetKey: string, position: DropPosition) => {
    if (dragged != null) performDrop(dragged, targetKey, position);
    endDrag();
  };

  const canDrop = (targetKey: string, position: DropPosition) =>
    canDropNode(dragged, targetKey, position);

  const hoverKey = (key: string | null) => {
    setHoveredGroupId(key == null ? null : groupOfNode(parseTreeKey(key)));
  };

  const visibleKeys = visibleKeysFor(buckets, expandedKeys, isDraggingGroup);

  const moveWithKeyboard = (key: string, direction: 'up' | 'down') => {
    const draggedNode = nodeFromKey(key);
    if (draggedNode == null || isDisabled) return;
    const candidates =
      draggedNode.kind === 'group'
        ? visibleKeys.filter(item => parseTreeKey(item)?.kind === 'group')
        : visibleKeys;
    const index = candidates.indexOf(key);
    const neighbor =
      candidates[direction === 'up' ? index - 1 : index + 1] ?? null;
    if (neighbor == null) return;
    const neighborNode = parseTreeKey(neighbor);
    let position: DropPosition = direction === 'up' ? 'before' : 'after';
    if (
      draggedNode.kind === 'account' &&
      neighborNode?.kind === 'group' &&
      direction === 'down'
    ) {
      position = 'on';
    }
    performDrop(draggedNode, neighbor, position);
  };

  const isGroupDropZoneActive = (groupId: AccountGroupEntity['id']) =>
    dragged?.kind === 'account' &&
    hoveredGroupId === groupId &&
    dragged.groupId !== groupId;

  return {
    beginDrag,
    endDrag,
    canDrop,
    completeDrop,
    hoverKey,
    moveWithKeyboard,
    visibleKeys,
    isGroupDropZoneActive,
    isDraggingGroup,
    draggingKey:
      dragged == null
        ? null
        : dragged.kind === 'account'
          ? `account:${dragged.accountId}`
          : `group:${dragged.groupId}`,
  };
}
