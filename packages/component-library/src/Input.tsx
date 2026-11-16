import { useState } from 'react';
import type {
  ChangeEvent,
  ComponentPropsWithRef,
  CSSProperties,
  FocusEvent,
  KeyboardEvent,
} from 'react';
import { Input as ReactAriaInput } from 'react-aria-components';

import { css, cx } from '@emotion/css';

import { Input as CossInput } from './coss/components/input';
import { useResponsive } from './hooks/useResponsive';
import type { ComponentSize } from './tokens';

export const baseInputStyle = {
  outline: 0,
  backgroundColor: 'var(--background)',
  color: 'var(--foreground)',
  margin: 0,
  padding: 0,
  borderRadius: 8,
  border: '1px solid var(--input)',
};

export const defaultInputClassName = css({
  ...baseInputStyle,
  padding: '6px 10px',
});

export type InputProps = Omit<
  ComponentPropsWithRef<typeof ReactAriaInput>,
  'size' | 'style' | 'className'
> & {
  size?: ComponentSize;
  style?: CSSProperties;
  className?:
    | string
    | ((renderProps: {
        isHovered: boolean;
        isFocused: boolean;
        isFocusVisible: boolean;
        isDisabled: boolean;
        isInvalid: boolean;
      }) => string);
  onEnter?: (value: string, event: KeyboardEvent<HTMLInputElement>) => void;
  onEscape?: (value: string, event: KeyboardEvent<HTMLInputElement>) => void;
  onChangeValue?: (
    newValue: string,
    event: ChangeEvent<HTMLInputElement>,
  ) => void;
  onUpdate?: (newValue: string, event: FocusEvent<HTMLInputElement>) => void;
};

function mapInputSize(
  size: ComponentSize | undefined,
): 'sm' | 'default' | 'lg' {
  switch (size) {
    case 'small':
      return 'sm';
    case 'large':
    case 'extra-large':
      return 'lg';
    default:
      return 'default';
  }
}

export function Input({
  ref,
  onEnter,
  onEscape,
  onChangeValue,
  onUpdate,
  className,
  size,
  style,
  ...props
}: InputProps) {
  const [isFocused, setFocused] = useState(false);
  const {
    isDisabled,
    isReadOnly,
    isRequired,
    isInvalid,
    validationBehavior: _validationBehavior,
    validate: _validate,
    render: _render,
    className: _className,
    style: _style,
    ...rest
  } = props as InputProps & {
    isDisabled?: boolean;
    isReadOnly?: boolean;
    isRequired?: boolean;
    isInvalid?: boolean;
    validationBehavior?: unknown;
    validate?: unknown;
    render?: unknown;
  };

  const resolvedClassName =
    typeof className === 'function'
      ? className({
          isHovered: false,
          isFocused,
          isFocusVisible: isFocused,
          isDisabled: Boolean(isDisabled),
          isInvalid: Boolean(isInvalid),
        })
      : className;

  return (
    <CossInput
      {...rest}
      ref={ref}
      unstyled
      size={mapInputSize(size)}
      disabled={Boolean(isDisabled || rest.disabled)}
      readOnly={Boolean(isReadOnly || rest.readOnly)}
      required={Boolean(isRequired || rest.required)}
      aria-invalid={isInvalid || undefined}
      data-focused={isFocused ? '' : undefined}
      data-disabled={isDisabled || rest.disabled ? '' : undefined}
      inputClassName={cx(
        defaultInputClassName,
        style && css({ ...style }),
        resolvedClassName,
      )}
      onKeyUp={event => {
        rest.onKeyUp?.(event);

        if (event.key === 'Enter' && onEnter) {
          onEnter(event.currentTarget.value, event);
        }

        if (event.key === 'Escape' && onEscape) {
          onEscape(event.currentTarget.value, event);
        }
      }}
      onFocus={event => {
        setFocused(true);
        rest.onFocus?.(event);
      }}
      onBlur={event => {
        setFocused(false);
        onUpdate?.(event.currentTarget.value, event);
        rest.onBlur?.(event);
      }}
      onChange={event => {
        onChangeValue?.(event.currentTarget.value, event);
        rest.onChange?.(event);
      }}
    />
  );
}

export function BigInput({ size = 'large', ...props }: InputProps) {
  return <Input size={size} {...props} />;
}

export function ResponsiveInput(props: InputProps) {
  const { isNarrowWidth } = useResponsive();

  return isNarrowWidth ? <BigInput {...props} /> : <Input {...props} />;
}
