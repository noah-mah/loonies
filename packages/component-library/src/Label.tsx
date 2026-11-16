import { forwardRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';

import { Label as CossLabel } from './coss/components/label';

type LabelProps = {
  title: ReactNode;
  style?: CSSProperties;
};

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ title, style }, ref) => {
    return (
      <CossLabel ref={ref} className="justify-end text-right" style={style}>
        {title}
      </CossLabel>
    );
  },
);

Label.displayName = 'Label';
