import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Trans } from 'react-i18next';

import { SvgAdd } from '@actual-app/components/icons/v1';
import { Input } from '@actual-app/components/input';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import { MODAL_Z_INDEX } from '#components/common/Modal';

const MENU_MAX_HEIGHT = 240;

type MenuPosition = {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  maxHeight: number;
};

function positionForTrigger(trigger: HTMLElement): MenuPosition {
  const rect = trigger.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom - 8;
  const spaceAbove = rect.top - 8;
  const openAbove = spaceBelow < 160 && spaceAbove > spaceBelow;
  const maxHeight = Math.min(
    MENU_MAX_HEIGHT,
    Math.max(120, openAbove ? spaceAbove : spaceBelow),
  );

  return {
    left: rect.left,
    width: rect.width,
    maxHeight,
    ...(openAbove
      ? { bottom: window.innerHeight - rect.top + 4 }
      : { top: rect.bottom + 4 }),
  };
}

const optionClassName = css({
  width: '100%',
  minHeight: 32,
  padding: '6px 12px',
  border: 'none',
  backgroundColor: 'transparent',
  color: theme.menuItemText,
  font: 'inherit',
  fontSize: 14,
  lineHeight: '18px',
  textAlign: 'left',
  cursor: 'default',
  '&[data-highlighted]': {
    backgroundColor: theme.menuItemBackgroundHover,
  },
});

const createClassName = css({
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontWeight: 500,
});

export type TransactionFieldMenuItem = {
  id: string;
  name: string;
};

export type TransactionFieldMenuSection = {
  label?: string;
  items: TransactionFieldMenuItem[];
};

type TransactionFieldMenuProps = {
  value: string;
  placeholder: string;
  ariaLabel: string;
  sections: TransactionFieldMenuSection[];
  createLabel: 'payee' | 'category';
  inputClassName?: string;
  onChangeValue: (value: string) => void;
  onSelect: (id: string) => void;
  onCreate?: (name: string) => Promise<void> | void;
  onClose?: () => void;
};

function CreateRow({
  kind,
  name,
}: {
  kind: 'payee' | 'category';
  name: string;
}) {
  return (
    <span className={createClassName}>
      <SvgAdd width={14} height={14} />
      {kind === 'category' ? (
        <Trans>Create category "{{ name }}"</Trans>
      ) : (
        <Trans>Create payee "{{ name }}"</Trans>
      )}
    </span>
  );
}

type MenuRow =
  | { kind: 'header'; key: string; label: string }
  | { kind: 'item'; key: string; id: string; label: string }
  | { kind: 'create'; key: 'create'; label: string };

function matchesQuery(name: string, query: string) {
  return name.toLowerCase().includes(query);
}

function initialHighlight(rows: MenuRow[]) {
  const selectable = rows.filter(row => row.kind !== 'header');
  const itemIndex = selectable.findIndex(row => row.kind === 'item');
  return itemIndex === -1 ? 0 : itemIndex;
}

function rowsForQuery(
  sections: TransactionFieldMenuSection[],
  query: string,
  canCreate: boolean,
): MenuRow[] {
  const trimmed = query.trim().toLowerCase();
  const rows: MenuRow[] = [];

  for (const [sectionIndex, section] of sections.entries()) {
    const sectionMatches =
      trimmed !== '' &&
      section.label != null &&
      matchesQuery(section.label, trimmed);
    const items = section.items.filter(
      item =>
        trimmed === '' || sectionMatches || matchesQuery(item.name, trimmed),
    );
    if (items.length === 0) {
      continue;
    }

    if (section.label) {
      rows.push({
        kind: 'header',
        key: `header-${sectionIndex}`,
        label: section.label,
      });
    }

    for (const item of items) {
      rows.push({
        kind: 'item',
        key: item.id,
        id: item.id,
        label: item.name,
      });
    }
  }

  const hasExactMatch = sections.some(section =>
    section.items.some(item => item.name.trim().toLowerCase() === trimmed),
  );
  if (canCreate && trimmed !== '' && !hasExactMatch) {
    rows.unshift({ kind: 'create', key: 'create', label: query.trim() });
  }

  return rows;
}

export function TransactionFieldMenu({
  value,
  placeholder,
  ariaLabel,
  sections,
  createLabel,
  inputClassName,
  onChangeValue,
  onSelect,
  onCreate,
  onClose,
}: TransactionFieldMenuProps) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const query = isFiltering ? value : '';
  const rows = rowsForQuery(sections, query, onCreate != null);
  const selectable = rows.filter(row => row.kind !== 'header');
  const filterKey = query.trim().toLowerCase();
  const [previousFilterKey, setPreviousFilterKey] = useState(filterKey);
  if (previousFilterKey !== filterKey) {
    setPreviousFilterKey(filterKey);
    setHighlightedIndex(initialHighlight(rows));
  }

  const activeIndex =
    selectable.length === 0
      ? -1
      : Math.min(highlightedIndex, selectable.length - 1);

  useLayoutEffect(() => {
    const trigger = triggerRef.current;
    if (!isOpen || trigger == null) {
      return;
    }

    const update = () => {
      setMenuPosition(positionForTrigger(trigger));
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [isOpen]);

  useEffect(() => {
    const highlighted = listRef.current?.querySelector('[data-highlighted]');
    if (highlighted instanceof HTMLElement) {
      highlighted.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex, isOpen, filterKey]);

  useEffect(() => {
    const node = triggerRef.current;
    if (node == null) {
      return;
    }

    const onFocusIn = () => {
      setIsFiltering(false);
      setIsOpen(true);
    };
    node.addEventListener('focusin', onFocusIn);
    return () => node.removeEventListener('focusin', onFocusIn);
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimer.current != null) {
        window.clearTimeout(closeTimer.current);
      }
    };
  }, []);

  function cancelClose() {
    if (closeTimer.current != null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function closeMenu(notifyParent: boolean) {
    cancelClose();
    setIsOpen(false);
    setIsFiltering(false);
    if (notifyParent) {
      onClose?.();
    }
  }

  function scheduleClose() {
    cancelClose();
    closeTimer.current = window.setTimeout(() => {
      closeMenu(true);
    }, 0);
  }

  async function choose(row: MenuRow | undefined) {
    if (row == null || row.kind === 'header') {
      return;
    }

    if (row.kind === 'create') {
      try {
        await onCreate?.(row.label);
        closeMenu(false);
      } catch {
        // The mutation reports its own error.
      }
      return;
    }

    onSelect(row.id);
    closeMenu(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape' && isOpen) {
      event.preventDefault();
      event.stopPropagation();
      closeMenu(true);
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setIsOpen(true);
      if (selectable.length === 0) {
        return;
      }

      const delta = event.key === 'ArrowDown' ? 1 : -1;
      const next =
        activeIndex < 0
          ? 0
          : (activeIndex + delta + selectable.length) % selectable.length;
      setHighlightedIndex(next);
      return;
    }

    if (event.key === 'Enter' && isOpen) {
      event.preventDefault();
      void choose(selectable[activeIndex]);
    }
  }

  const rowSelectableIndex = new Map<string, number>();
  let nextSelectableIndex = 0;
  for (const row of rows) {
    if (row.kind === 'header') {
      continue;
    }

    rowSelectableIndex.set(row.key, nextSelectableIndex);
    nextSelectableIndex += 1;
  }

  return (
    <View>
      <View ref={triggerRef}>
        <Input
          value={value}
          aria-label={ariaLabel}
          aria-expanded={isOpen}
          aria-autocomplete="list"
          placeholder={placeholder}
          className={inputClassName}
          onFocus={() => {
            setIsFiltering(false);
            setIsOpen(true);
          }}
          onBlur={() => {
            scheduleClose();
          }}
          onKeyDown={onKeyDown}
          onChangeValue={next => {
            setIsFiltering(true);
            setIsOpen(true);
            onChangeValue(next);
          }}
        />
      </View>
      {isOpen &&
        rows.length > 0 &&
        menuPosition != null &&
        createPortal(
          <View
            ref={listRef}
            role="listbox"
            aria-label={ariaLabel}
            data-testid={`transaction-field-menu-${createLabel}`}
            onMouseDown={event => {
              event.preventDefault();
            }}
            style={{
              position: 'fixed',
              zIndex: MODAL_Z_INDEX + 1,
              top: menuPosition.top,
              bottom: menuPosition.bottom,
              left: menuPosition.left,
              width: menuPosition.width,
              maxHeight: menuPosition.maxHeight,
              overflowY: 'auto',
              padding: '4px 0',
              borderRadius: 6,
              border: `1px solid ${theme.menuBorder}`,
              backgroundColor: theme.menuBackground,
              color: theme.menuItemText,
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
            }}
          >
            {rows.map(row => {
              if (row.kind === 'header') {
                return (
                  <Text
                    key={row.key}
                    style={{
                      padding: '8px 12px 4px',
                      fontSize: 12,
                      fontWeight: 500,
                      lineHeight: '16px',
                      color: theme.pageTextSubdued,
                    }}
                  >
                    {row.label}
                  </Text>
                );
              }

              const index = rowSelectableIndex.get(row.key) ?? -1;
              const isHighlighted = index === activeIndex;

              return (
                <button
                  key={row.key}
                  type="button"
                  role="option"
                  aria-selected={isHighlighted}
                  data-highlighted={isHighlighted || undefined}
                  className={optionClassName}
                  onMouseDown={event => {
                    event.preventDefault();
                    cancelClose();
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => {
                    void choose(row);
                  }}
                >
                  {row.kind === 'create' ? (
                    <CreateRow kind={createLabel} name={row.label} />
                  ) : (
                    row.label
                  )}
                </button>
              );
            })}
          </View>,
          document.body,
        )}
    </View>
  );
}
