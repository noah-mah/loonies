import { useId, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Dialog,
  DialogPopup,
  DialogTitle,
  Sheet,
  SheetPopup,
  SheetTitle,
} from '@actual-app/components/coss';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { AnimatedLoading } from '@actual-app/components/icons/AnimatedLoading';
import { Input } from '@actual-app/components/input';
import { styles } from '@actual-app/components/styles';
import type { CSSProperties } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';

import { useCossModal } from '#hooks/useCossModal';
import type { Modal as ModalType } from '#modals/modalsSlice';

const SHEET_MAX_HEIGHT = 'min(660px, 90dvh)';

const titleStyle: CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  color: theme.pageTextDark,
  textAlign: 'center',
};

type MobileSheetChildArgs = {
  close: () => void;
  editTitle: () => void;
  isEditingTitle: boolean;
};

type MobileSheetProps = {
  name: ModalType['name'];
  title: string;
  onTitleUpdate?: (newTitle: string) => string | undefined;
  isLoading?: boolean;
  wrapperStyle?: CSSProperties;
  onClose?: () => void;
  children: ReactNode | ((args: MobileSheetChildArgs) => ReactNode);
};

export function MobileSheet({
  name,
  title,
  onTitleUpdate,
  isLoading,
  wrapperStyle,
  onClose,
  children,
}: MobileSheetProps) {
  const { t } = useTranslation();
  const { isNarrowWidth } = useResponsive();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);
  const ignoreBlurRef = useRef(false);
  const titleId = useId();
  const modal = useCossModal(name, onClose);

  const editTitle = () => {
    ignoreBlurRef.current = false;
    setTitleError(null);
    setIsEditingTitle(true);
  };

  const stopEditing = () => {
    ignoreBlurRef.current = true;
    setTitleError(null);
    setIsEditingTitle(false);
  };

  const commitTitle = (newTitle: string, isBlur: boolean) => {
    if (ignoreBlurRef.current) {
      return;
    }
    const trimmed = newTitle.trim();
    if (!trimmed || trimmed === title) {
      stopEditing();
      return;
    }
    const error = onTitleUpdate?.(trimmed);
    if (error && !isBlur) {
      setTitleError(error);
      return;
    }
    stopEditing();
  };

  const onTitleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      event.preventDefault();
      stopEditing();
    }
  };

  const renderChildren = () =>
    typeof children === 'function'
      ? children({ close: modal.close, editTitle, isEditingTitle })
      : children;

  const loadingCover = isLoading ? (
    <View
      style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: theme.pageBackground,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
      }}
    >
      <AnimatedLoading
        style={{ width: 20, height: 20 }}
        color={theme.pageText}
      />
    </View>
  ) : null;

  if (!isNarrowWidth) {
    return (
      <Dialog open={modal.open} onOpenChange={modal.onOpenChange}>
        <DialogPopup
          showCloseButton
          data-testid={`${name}-modal`}
          aria-labelledby={titleId}
        >
          <DialogTitle id={titleId} className="px-6 pt-6 text-center">
            {title}
          </DialogTitle>
          {renderChildren()}
          {loadingCover}
        </DialogPopup>
      </Dialog>
    );
  }

  return (
    <Sheet open={modal.open} onOpenChange={modal.onOpenChange}>
      <SheetPopup
        side="bottom"
        showCloseButton={false}
        data-testid={`${name}-modal`}
        aria-labelledby={titleId}
        className="max-h-[min(660px,90dvh)]"
        style={{ maxHeight: SHEET_MAX_HEIGHT, ...wrapperStyle }}
      >
        <View
          style={{
            alignItems: 'center',
            padding: `${spacing.xs}px ${spacing.lg}px ${spacing.sm}px`,
            flexShrink: 0,
          }}
        >
          {isEditingTitle ? (
            <View style={{ width: '100%', alignItems: 'center' }}>
              <Input
                id={titleId}
                aria-label={t('Name')}
                defaultValue={title}
                autoFocus
                onEnter={value => commitTitle(value, false)}
                onBlur={event => commitTitle(event.currentTarget.value, true)}
                onKeyDown={onTitleKeyDown}
                style={{ ...titleStyle, width: '100%' }}
              />
              {titleError && (
                <Text
                  style={{
                    ...styles.verySmallText,
                    color: theme.errorText,
                    textAlign: 'center',
                    marginTop: spacing.xs,
                  }}
                >
                  {titleError}
                </Text>
              )}
            </View>
          ) : (
            <SheetTitle
              id={titleId}
              style={{
                ...titleStyle,
                ...styles.lineClamp(2),
                overflowWrap: 'anywhere',
                maxWidth: '100%',
                margin: 0,
              }}
            >
              {title}
            </SheetTitle>
          )}
        </View>
        <View style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {renderChildren()}
        </View>
        {loadingCover}
      </SheetPopup>
    </Sheet>
  );
}
