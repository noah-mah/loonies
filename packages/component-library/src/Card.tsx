import { forwardRef } from 'react';
import type { ComponentProps } from 'react';

import { Card as CossCard } from './coss/components/card';
import { css, cx } from './css';
import { View } from './View';

type CardProps = ComponentProps<typeof View>;

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ children, style, className, nativeStyle, innerRef, ...props }, ref) => {
    return (
      <CossCard
        {...props}
        ref={innerRef ?? ref}
        className={cx(className, style && css(style))}
        style={nativeStyle}
      >
        {children}
      </CossCard>
    );
  },
);

Card.displayName = 'Card';
