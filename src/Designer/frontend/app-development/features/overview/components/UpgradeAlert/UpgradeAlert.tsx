import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioAlert, StudioHeading, StudioLink, StudioParagraph } from '@studio/components';
import { FeatureFlag, useFeatureFlag } from '@studio/feature-flags';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useUserQuery } from 'app-shared/hooks/queries';
import { useAppUpgradeStatusQuery } from 'app-shared/hooks/queries/useAppUpgradeStatusQuery';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import type { AppUpgradeStatus } from 'app-shared/types/AppUpgrade';
import { RoutePaths } from 'app-development/enums/RoutePaths';

export const UpgradeAlert = (): ReactElement | null => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const isUpgradeHelperEnabled = useFeatureFlag(FeatureFlag.AppUpgradeHelper);
  const { data: user } = useUserQuery();
  const isOrganizationRepo = user !== undefined && user.login !== org;
  const { data: status } = useAppUpgradeStatusQuery(
    org,
    app,
    isUpgradeHelperEnabled && isOrganizationRepo,
  );

  if (!isUpgradeHelperEnabled || !status?.isAutomaticUpgradeSupported) return null;

  const version = status.targetMajorVersion;
  return (
    <StudioAlert data-color='info'>
      <StudioHeading level={2} data-size='xs'>
        {t(titleKey(status), { version })}
      </StudioHeading>
      <StudioParagraph>{t('app_upgrade.overview.description')}</StudioParagraph>
      <StudioLink href={`${APP_DEVELOPMENT_BASENAME}/${org}/${app}/${RoutePaths.AppUpgrade}`}>
        {t('app_upgrade.overview.go_to_upgrade')}
      </StudioLink>
    </StudioAlert>
  );
};

const titleKey = (status: AppUpgradeStatus): string => {
  if (!status.activeUpgradeBranch) return 'app_upgrade.intro.title';
  return status.activeUpgradeHasPullRequest
    ? 'app_upgrade.done.title'
    : 'app_upgrade.overview.in_progress_title';
};
