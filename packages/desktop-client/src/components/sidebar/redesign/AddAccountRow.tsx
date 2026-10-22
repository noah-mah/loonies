import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgAdd } from '@actual-app/components/icons/v1';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { radius, spacing } from '@actual-app/components/tokens';
import { css } from '@emotion/css';

import { replaceModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

/**
 * Paper-style text control at the bottom of the accounts list.
 * The accounts header keeps a compact “+” for power users; this is the
 * primary, labeled affordance matching the light sidebar mock.
 */
export function AddAccountRow() {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  return (
    <Button
      variant="bare"
      data-testid="sidebar-add-account"
      aria-label={t('Add account')}
      className={css({
        width: '100%',
        justifyContent: 'flex-start',
        gap: spacing.xs,
        marginTop: spacing.xs,
        marginBottom: spacing.sm,
        paddingBlock: spacing.sm,
        paddingInline: spacing.sm,
        borderRadius: radius.sm,
        color: theme.sidebarTextSubdued,
        fontSize: 13,
        fontWeight: 500,
        '&[data-hovered], &[data-focus-visible]': {
          backgroundColor: theme.sidebarItemBackgroundHover,
          color: theme.sidebarItemText,
        },
      })}
      onPress={() =>
        dispatch(replaceModal({ modal: { name: 'add-account', options: {} } }))
      }
    >
      <SvgAdd width={12} height={12} style={{ flexShrink: 0 }} />
      <Text>
        <Trans>Add account</Trans>
      </Text>
    </Button>
  );
}
