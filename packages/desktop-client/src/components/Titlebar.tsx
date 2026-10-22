import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Route, Routes, useLocation } from 'react-router';

import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { SvgArrowLeft } from '@actual-app/components/icons/v1';
import { SvgNavigationMenu } from '@actual-app/components/icons/v2';
import { SpaceBetween } from '@actual-app/components/space-between';
import type { CSSProperties } from '@actual-app/components/styles';
import { View } from '@actual-app/components/view';
import * as Platform from '@actual-app/core/shared/platform';

import { SharedArrayBufferWarning } from '#components/SharedArrayBufferWarning';
import { useGlobalPref } from '#hooks/useGlobalPref';
import { useNavigate } from '#hooks/useNavigate';

import { AccountSyncCheck } from './accounts/AccountSyncCheck';
import { useSidebar } from './sidebar/SidebarProvider';

type TitlebarProps = {
  style?: CSSProperties;
};

export function Titlebar({ style }: TitlebarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const sidebar = useSidebar();
  const { isNarrowWidth } = useResponsive();
  const [floatingSidebar] = useGlobalPref('floatingSidebar');

  return isNarrowWidth ? null : (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: '0 10px 0 15px',
        height: 36,
        pointerEvents: 'none',
        '& *': {
          pointerEvents: 'auto',
        },
        ...(!Platform.isBrowser && Platform.OS === 'mac' && floatingSidebar
          ? { paddingLeft: 80 }
          : {}),
        ...style,
      }}
    >
      {(floatingSidebar || sidebar.alwaysFloats) && (
        <Button
          aria-label={t('Sidebar menu')}
          variant="bare"
          style={{ marginRight: 8 }}
          onHoverStart={e => {
            if (e.pointerType === 'mouse') {
              sidebar.setHidden(false);
            }
          }}
          onPress={e => {
            if (e.pointerType !== 'mouse') {
              sidebar.setHidden(!sidebar.hidden);
            }
          }}
        >
          <SvgNavigationMenu
            className="menu"
            style={{ width: 15, height: 15, left: 0 }}
          />
        </Button>
      )}

      <Routes>
        <Route
          path="*"
          element={
            location.state?.goBack ? (
              <Button variant="bare" onPress={() => navigate(-1)}>
                <SvgArrowLeft
                  width={10}
                  height={10}
                  style={{ marginRight: 5 }}
                />{' '}
                <Trans>Back</Trans>
              </Button>
            ) : null
          }
        />

        <Route path="/accounts/:id" element={<AccountSyncCheck />} />
      </Routes>
      <View style={{ flex: 1 }} />
      <SpaceBetween gap={10}>
        <SharedArrayBufferWarning />
      </SpaceBetween>
    </View>
  );
}
