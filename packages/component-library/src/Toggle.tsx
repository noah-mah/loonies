import type { CSSProperties } from 'react';

import { Switch } from './coss/components/switch';

type ToggleProps = {
  id: string;
  isOn: boolean;
  isDisabled?: boolean;
  onToggle?: (isOn: boolean) => void;
  className?: string;
  style?: CSSProperties;
  'aria-label'?: string;
};

export function Toggle({
  id,
  isOn,
  isDisabled = false,
  onToggle,
  className,
  style,
  'aria-label': ariaLabel,
}: ToggleProps) {
  return (
    <Switch
      id={id}
      checked={isOn}
      disabled={isDisabled}
      onCheckedChange={checked => onToggle?.(checked)}
      className={className}
      style={style}
      aria-label={ariaLabel}
    />
  );
}
