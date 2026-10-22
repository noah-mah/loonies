import { type SVGProps } from 'react';

import { type LucideIcon, type LucideProps } from 'lucide-react';

/**
 * Adapts a Lucide icon to the historical Svg* API used across the app
 * (`width` / `height` / `style` / `currentColor`).
 */
export function createLucideIcon(Icon: LucideIcon) {
  function SvgIcon(props: SVGProps<SVGSVGElement>) {
    const { width, height, style, color, strokeWidth, ...rest } = props;
    const size = width ?? height ?? 24;

    const lucideProps = {
      ...rest,
      size,
      width,
      height,
      color: color ?? 'currentColor',
      strokeWidth: strokeWidth ?? 2,
      style: { color: 'inherit', ...style },
      'aria-hidden': props['aria-hidden'] ?? true,
    } satisfies LucideProps;

    return <Icon {...lucideProps} />;
  }

  return SvgIcon;
}
