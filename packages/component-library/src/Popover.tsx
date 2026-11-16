import { useCallback, useEffect, useRef } from 'react';
import type { ComponentProps } from 'react';
import { Popover as ReactAriaPopover } from 'react-aria-components';

import { css, cx } from './css';

type PopoverProps = ComponentProps<typeof ReactAriaPopover>;

export const Popover = ({
  style = {},
  shouldCloseOnInteractOutside,
  ...props
}: PopoverProps) => {
  const ref = useRef<HTMLElement>(null);

  const handleFocus = useCallback(
    (e: FocusEvent) => {
      if (!ref.current?.contains(e.relatedTarget as Node)) {
        props.onOpenChange?.(false);
      }
    },
    [props],
  );

  useEffect(() => {
    if (!props.isNonModal) return;
    if (props.isOpen) {
      ref.current?.addEventListener('focusout', handleFocus);
    } else {
      ref.current?.removeEventListener('focusout', handleFocus);
    }
  }, [handleFocus, props.isNonModal, props.isOpen]);

  return (
    <ReactAriaPopover
      data-popover
      ref={ref}
      placement="bottom end"
      offset={1}
      className={cx(
        'z-50 rounded-lg border bg-popover p-0 text-popover-foreground shadow-lg/5 outline-none',
        css({
          padding: 0,
          userSelect: 'none',
          ...style,
        }),
      )}
      shouldCloseOnInteractOutside={element => {
        if (shouldCloseOnInteractOutside) {
          return shouldCloseOnInteractOutside(element);
        }

        return true;
      }}
      {...props}
    />
  );
};
