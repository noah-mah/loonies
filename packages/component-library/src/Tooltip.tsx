import type { ComponentProps, ReactNode } from 'react';
import type {
  Tooltip as AriaTooltip,
  TooltipTrigger,
} from 'react-aria-components';

import {
  Tooltip as CossTooltip,
  TooltipPopup,
  TooltipProvider,
  TooltipTrigger as CossTooltipTrigger,
} from './coss/components/tooltip';

type TooltipProps = Partial<ComponentProps<typeof AriaTooltip>> & {
  children: ReactNode;
  content: ReactNode;
  triggerProps?: Partial<ComponentProps<typeof TooltipTrigger>>;
  disablePointerEvents?: boolean;
};

function mapPlacement(placement: string | undefined) {
  const [sideRaw = 'top', alignRaw = 'center'] = (placement ?? 'top').split(
    ' ',
  );
  const side =
    sideRaw === 'start' ? 'left' : sideRaw === 'end' ? 'right' : sideRaw;
  const align =
    alignRaw === 'start' || alignRaw === 'end' ? alignRaw : 'center';

  return {
    side: side as 'top' | 'bottom' | 'left' | 'right',
    align: align as 'start' | 'center' | 'end',
  };
}

export function Tooltip({
  children,
  content,
  triggerProps = {},
  disablePointerEvents = false,
  placement,
  offset,
}: TooltipProps) {
  const { side, align } = mapPlacement(
    typeof placement === 'string' ? placement : undefined,
  );

  return (
    <TooltipProvider>
      <CossTooltip disableHoverablePopup={disablePointerEvents}>
        <CossTooltipTrigger
          delay={triggerProps.delay ?? 300}
          closeDelay={triggerProps.closeDelay ?? 0}
          disabled={triggerProps.isDisabled}
          render={<span className="inline-flex max-w-full shrink-0" />}
        >
          {children}
        </CossTooltipTrigger>
        <TooltipPopup
          side={side}
          align={align}
          sideOffset={typeof offset === 'number' ? offset : 4}
          className={disablePointerEvents ? 'pointer-events-none' : undefined}
        >
          {content}
        </TooltipPopup>
      </CossTooltip>
    </TooltipProvider>
  );
}
