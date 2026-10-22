import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgExpandArrow } from '@actual-app/components/icons/v0';
import { SvgTime } from '@actual-app/components/icons/v1';
import { SvgPencil1 } from '@actual-app/components/icons/v2';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { Input } from '@actual-app/components/input';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { radius, spacing } from '@actual-app/components/tokens';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';
import { isElectron } from '@actual-app/core/shared/environment';
import { css, cx } from '@emotion/css';

import { closeBudget } from '#budgetfiles/budgetfilesSlice';
import { useContextMenu } from '#hooks/useContextMenu';
import { useMetadataPref } from '#hooks/useMetadataPref';
import { useNavigate } from '#hooks/useNavigate';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

type SidebarBudgetNameProps = {
  isEditing: boolean;
  onEditingChange: (isEditing: boolean) => void;
};

export function SidebarBudgetName({
  isEditing,
  onEditingChange,
}: SidebarBudgetNameProps) {
  const { t } = useTranslation();
  const [budgetName, setBudgetNamePref] = useMetadataPref('budgetName');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const triggerRef = useRef<HTMLButtonElement>(null);

  const { handleContextMenu } = useContextMenu({
    triggerRef,
    items: [
      {
        name: 'rename',
        text: t('Rename budget'),
        onClick: () => onEditingChange(true),
      },
      {
        name: 'settings',
        text: t('Settings'),
        onClick: () => void navigate('/settings'),
      },
      isElectron() && {
        name: 'loadBackup',
        text: t('Load Backup…'),
        onClick: () =>
          dispatch(pushModal({ modal: { name: 'load-backup', options: {} } })),
      },
      {
        name: 'close',
        text: t('Switch file'),
        onClick: () => void dispatch(closeBudget()),
      },
    ],
  });

  const iconButtonClassName = cx(
    'hover-visible',
    css({
      backgroundColor: 'transparent',
      '&[data-hovered], &[data-focus-visible]': {
        backgroundColor: theme.sidebarControlBackground,
      },
    }),
  );

  function saveBudgetName(newBudgetName: string) {
    if (newBudgetName.trim() !== '' && newBudgetName !== budgetName) {
      setBudgetNamePref(newBudgetName);
    }
    onEditingChange(false);
  }

  return (
    <>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          minWidth: 0,
          visibility: isEditing ? 'hidden' : undefined,
          '& .hover-visible': {
            opacity: 0,
          },
          '&:hover .hover-visible, & .hover-visible[data-focus-visible]': {
            opacity: 1,
          },
        }}
      >
        <Button
          ref={triggerRef}
          data-testid="budget-name"
          variant="bare"
          aria-label={t('Budget menu')}
          aria-haspopup="menu"
          className={css({
            backgroundColor: theme.sidebarControlBackground,
            maxWidth: '100%',
            '&[data-hovered], &[data-focus-visible]': {
              backgroundColor: theme.sidebarItemBackgroundHover,
            },
          })}
          style={{
            color: theme.sidebarBudgetName,
            fontSize: 13,
            fontWeight: 600,
            paddingTop: spacing.xs,
            paddingBottom: spacing.xs,
            paddingLeft: spacing.sm,
            paddingRight: spacing.sm,
            borderRadius: radius.sm,
            gap: spacing.xs,
            minWidth: 0,
            justifyContent: 'flex-start',
          }}
          onPress={handleContextMenu}
        >
          <Text style={{ ...styles.ellipsisText, minWidth: 0 }}>
            {budgetName || t('Unnamed')}
          </Text>
          <SvgExpandArrow
            width={7}
            height={7}
            style={{ flexShrink: 0, color: theme.sidebarTextSubdued }}
          />
        </Button>
        <Button
          variant="bare"
          className={iconButtonClassName}
          aria-label={t('Rename budget')}
          style={{ padding: spacing.xxs, flexShrink: 0 }}
          onPress={() => onEditingChange(true)}
        >
          <SvgPencil1
            width={11}
            height={11}
            style={{ color: theme.sidebarTextSubdued }}
          />
        </Button>
        {isElectron() && (
          <Tooltip
            content={t('Load Backup…')}
            placement="bottom start"
            style={styles.tooltip}
            triggerProps={{ delay: 500 }}
          >
            <Button
              variant="bare"
              className={iconButtonClassName}
              aria-label={t('Load Backup…')}
              style={{ padding: spacing.xxs, flexShrink: 0 }}
              onPress={() =>
                dispatch(
                  pushModal({ modal: { name: 'load-backup', options: {} } }),
                )
              }
            >
              <SvgTime
                width={11}
                height={11}
                style={{ color: theme.sidebarTextSubdued }}
              />
            </Button>
          </Tooltip>
        )}
      </View>
      {isEditing && (
        <InitialFocus>
          <Input
            aria-label={t('Budget name')}
            size="medium"
            style={{
              position: 'absolute',
              top: '50%',
              left: 0,
              width: '100%',
              transform: 'translateY(-50%)',
              fontWeight: 600,
            }}
            defaultValue={budgetName}
            onEnter={saveBudgetName}
            onUpdate={saveBudgetName}
            onEscape={() => onEditingChange(false)}
          />
        </InitialFocus>
      )}
    </>
  );
}
