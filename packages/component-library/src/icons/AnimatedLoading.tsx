import React from 'react';
import type { SVGProps } from 'react';

import { css, keyframes } from '@emotion/css';

import { SvgLoading } from './Loading';

const rotation = keyframes({
  '0%': { transform: 'rotate(0deg)' },
  '100%': { transform: 'rotate(360deg)' },
});

export function AnimatedLoading(props: SVGProps<SVGSVGElement>) {
  return (
    <span
      className={css({
        display: 'inline-flex',
        animationName: rotation,
        animationDuration: '1s',
        animationTimingFunction: 'linear',
        animationIterationCount: 'infinite',
        lineHeight: 0,
      })}
    >
      <SvgLoading {...props} />
    </span>
  );
}
