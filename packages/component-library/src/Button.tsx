import { forwardRef, useState } from 'react';
import type {
  CSSProperties,
  FocusEvent,
  MouseEvent,
  PointerEvent,
  ReactNode,
} from 'react';
import {
  ButtonContext,
  useContextProps,
  type ButtonProps as ReactAriaButtonProps,
} from 'react-aria-components';

import { css, cx } from '@emotion/css';

import { Button as CossButton } from './coss/components/button';
import type { ComponentSize } from './tokens';

type ButtonVariant = 'normal' | 'primary' | 'bare' | 'menu' | 'menuSelected';

type ButtonRenderProps = {
  isHovered: boolean;
  isPressed: boolean;
  isFocused: boolean;
  isFocusVisible: boolean;
  isDisabled: boolean;
  isPending: boolean;
};

type ButtonProps = Omit<ReactAriaButtonProps, 'style' | 'className'> & {
  variant?: ButtonVariant;
  size?: ComponentSize;
  bounce?: boolean;
  isLoading?: boolean;
  children?: ReactNode;
  style?: CSSProperties | ((renderProps: ButtonRenderProps) => CSSProperties);
  className?: string | ((renderProps: ButtonRenderProps) => string | undefined);
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
};

type CossButtonVariant = 'default' | 'outline' | 'ghost';
type CossButtonSize = 'default' | 'sm' | 'lg' | 'xl';

function mapButtonVariant(variant: ButtonVariant): CossButtonVariant {
  if (variant === 'primary') return 'default';
  if (variant === 'normal') return 'outline';
  return 'ghost';
}

function mapButtonSize(
  size: ComponentSize | undefined,
): CossButtonSize | undefined {
  switch (size) {
    case 'small':
      return 'sm';
    case 'medium':
      return 'default';
    case 'large':
      return 'lg';
    case 'extra-large':
      return 'xl';
    default:
      return undefined;
  }
}

function toPressEvent(
  event: PointerEvent<HTMLButtonElement> | MouseEvent<HTMLButtonElement>,
  type: 'pressstart' | 'pressend' | 'press',
) {
  const pointerType =
    'pointerType' in event && event.pointerType
      ? event.pointerType
      : event.detail === 0
        ? 'keyboard'
        : 'mouse';

  return {
    type,
    pointerType,
    target: event.target,
    shiftKey: event.shiftKey,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
    altKey: event.altKey,
    x: event.clientX,
    y: event.clientY,
    continuePropagation() {},
    preventDefault() {
      event.preventDefault();
    },
  };
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (props, forwardedRef) => {
    const [mergedProps, ref] = useContextProps(
      props,
      forwardedRef,
      ButtonContext,
    );
    const {
      children,
      variant = 'normal',
      bounce: _bounce,
      size,
      isDisabled,
      isPending,
      isLoading,
      excludeFromTabOrder,
      preventFocusOnPress,
      onPress,
      onPressStart,
      onPressEnd,
      onPressChange,
      onPressUp,
      onHoverStart,
      onHoverEnd,
      onHoverChange,
      onClick,
      render: _render,
      onPointerDown,
      onPointerUp,
      onPointerEnter,
      onPointerLeave,
      onMouseDown,
      onFocus,
      onBlur,
      style,
      className,
      slot: _slot,
      ...rest
    } = mergedProps;

    const [isHovered, setHovered] = useState(false);
    const [isPressed, setPressed] = useState(false);
    const [isFocused, setFocused] = useState(false);
    const [isFocusVisible, setFocusVisible] = useState(false);
    const disabled = Boolean(isDisabled);

    const renderProps: ButtonRenderProps = {
      isHovered,
      isPressed: isPressed || variant === 'menuSelected',
      isFocused,
      isFocusVisible,
      isDisabled: disabled,
      isPending: Boolean(isPending || isLoading),
    };

    const resolvedStyle =
      typeof style === 'function' ? style(renderProps) : style;
    const resolvedClassName =
      typeof className === 'function' ? className(renderProps) : className;

    return (
      <CossButton
        {...rest}
        ref={ref}
        variant={mapButtonVariant(variant)}
        size={mapButtonSize(size)}
        disabled={disabled}
        loading={Boolean(isLoading)}
        data-pressed={variant === 'menuSelected' ? '' : undefined}
        {...(excludeFromTabOrder ? { tabIndex: -1 } : null)}
        className={cx(
          variant === 'menu' || variant === 'menuSelected'
            ? 'w-full justify-start'
            : undefined,
          resolvedStyle && css({ ...resolvedStyle }),
          resolvedClassName,
        )}
        onMouseDown={event => {
          if (preventFocusOnPress) event.preventDefault();
          onMouseDown?.(event);
        }}
        onPointerDown={event => {
          onPointerDown?.(event);
          if (disabled) return;
          setPressed(true);
          onPressStart?.(toPressEvent(event, 'pressstart') as never);
          onPressChange?.(true);
        }}
        onPointerUp={event => {
          onPointerUp?.(event);
          if (!isPressed) return;
          setPressed(false);
          onPressEnd?.(toPressEvent(event, 'pressend') as never);
          onPressUp?.(toPressEvent(event, 'pressend') as never);
          onPressChange?.(false);
        }}
        onPointerEnter={event => {
          onPointerEnter?.(event);
          setHovered(true);
          onHoverStart?.({
            type: 'hoverstart',
            pointerType: event.pointerType === 'pen' ? 'pen' : 'mouse',
            target: event.currentTarget,
          });
          onHoverChange?.(true);
        }}
        onPointerLeave={event => {
          onPointerLeave?.(event);
          setHovered(false);
          if (isPressed) {
            setPressed(false);
            onPressChange?.(false);
          }
          onHoverEnd?.({
            type: 'hoverend',
            pointerType: event.pointerType === 'pen' ? 'pen' : 'mouse',
            target: event.currentTarget,
          });
          onHoverChange?.(false);
        }}
        onFocus={event => {
          setFocused(true);
          setFocusVisible(event.currentTarget.matches(':focus-visible'));
          onFocus?.(event as FocusEvent<HTMLButtonElement>);
        }}
        onBlur={event => {
          setFocused(false);
          setFocusVisible(false);
          onBlur?.(event as FocusEvent<HTMLButtonElement>);
        }}
        onClick={event => {
          if (disabled) return;
          onPress?.(toPressEvent(event, 'press') as never);
          onClick?.(event);
        }}
      >
        {children}
      </CossButton>
    );
  },
);

Button.displayName = 'Button';

type ButtonWithLoadingProps = ButtonProps & {
  isLoading?: boolean;
};

export const ButtonWithLoading = forwardRef<
  HTMLButtonElement,
  ButtonWithLoadingProps
>((props, ref) => {
  const { isLoading, ...buttonProps } = props;
  return <Button {...buttonProps} ref={ref} isLoading={isLoading} />;
});

ButtonWithLoading.displayName = 'ButtonWithLoading';
