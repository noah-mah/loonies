import type { KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { css } from '@actual-app/components/css';
import { SvgMenu } from '@actual-app/components/icons/v1';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { radius } from '@actual-app/components/tokens';

import { useSidebarTree } from './sidebarTreeContext';

type DragHandleProps = {
  itemKey: string;
};

export function DragHandle({ itemKey }: DragHandleProps) {
  const { t } = useTranslation();
  const tree = useSidebarTree();

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    event.stopPropagation();
    tree.moveWithKeyboard(itemKey, event.key === 'ArrowUp' ? 'up' : 'down');
  };

  return (
    <button
      type="button"
      data-drag-handle=""
      aria-label={t('Reorder')}
      aria-disabled={tree.isDragDisabled || undefined}
      className={css({
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
      })}
      onKeyDown={onKeyDown}
    >
      <SvgMenu style={{ width: 10, height: 10 }} />
    </button>
  );
}
