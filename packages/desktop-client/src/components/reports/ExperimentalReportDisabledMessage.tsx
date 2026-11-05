import { Trans } from 'react-i18next';

import { Block } from '@actual-app/components/block';
import { View } from '@actual-app/components/view';

import { Link } from '#components/common/Link';

type ExperimentalReportDisabledMessageProps = {
  reportName: string;
  experimentalSettingName: string;
};

export function ExperimentalReportDisabledMessage({
  reportName,
  experimentalSettingName,
}: ExperimentalReportDisabledMessageProps) {
  return (
    <View
      style={{
        flex: 1,
        gap: 16,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        maxWidth: 480,
        alignSelf: 'center',
      }}
    >
      <Block style={{ fontSize: 18, textAlign: 'center' }}>
        <Trans>
          The {{ reportName }} report is turned off. Turn on &ldquo;
          {{ experimentalSettingName }}&rdquo; under{' '}
          <Link variant="internal" to="/settings/experimental">
            Settings &rarr; Experimental features
          </Link>{' '}
          to use it.
        </Trans>
      </Block>
      <Link variant="internal" to="/reports">
        <Trans>Back to reports</Trans>
      </Link>
    </View>
  );
}
