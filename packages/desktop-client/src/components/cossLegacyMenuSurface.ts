import { theme } from '@actual-app/components/theme';
import { css } from '@emotion/css';

/** Legacy {@link Menu} lists inside Coss {@link MenuPopup}. */
export const cossLegacyMenuPopup = css({
  backgroundColor: `${theme.menuBackground} !important`,
  borderColor: `${theme.menuBorder} !important`,
  color: theme.menuItemText,
  '&::before': {
    display: 'none',
  },
});

export const cossLegacyMenuList = css({
  color: theme.menuItemText,
  '& [role="menu"]': {
    backgroundColor: 'transparent',
  },
  '& [data-slot="button"]': {
    backgroundColor: 'transparent !important',
    borderColor: 'transparent !important',
    boxShadow: 'none !important',
    color: `${theme.menuItemText} !important`,
  },
  '& [data-slot="button"][data-hovered]': {
    backgroundColor: `${theme.pillBackgroundLight} !important`,
    color: `${theme.menuItemTextHover} !important`,
  },
  '& [role="menu"] span': {
    color: 'inherit',
  },
});
