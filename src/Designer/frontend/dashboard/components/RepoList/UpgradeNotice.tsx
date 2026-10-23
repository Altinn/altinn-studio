import React from 'react';
import { StudioLink } from '@studio/components';
import { useTranslation } from 'react-i18next';
import type { Repository } from 'app-shared/types/Repository';
import type { AppUpgradeStatus } from 'app-shared/types/AppUpgrade';
import { useAppUpgradeStatusQuery } from 'app-shared/hooks/queries/useAppUpgradeStatusQuery';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { useIsOrganizationRepo } from '../../hooks/useIsOrganizationRepo';
import classes from './UpgradeNotice.module.css';

type UpgradeNoticeProps = {
  repo: Repository;
};

export const UpgradeNotice = ({ repo }: UpgradeNoticeProps): React.ReactElement | null => {
  const { t } = useTranslation();
  const [org, app] = repo.full_name.split('/');
  const isOrganizationRepo = useIsOrganizationRepo(org);
  const canUpgrade = isOrganizationRepo && Boolean(repo.permissions?.push);
  const { data: status } = useAppUpgradeStatusQuery(org, app, canUpgrade);

  if (!canUpgrade || !status) return null;

  if (isUpgraded(status)) {
    return <span className={classes.upgraded}>{t('app_upgrade.notice_upgraded')}</span>;
  }

  if (!status.isAutomaticUpgradeSupported) return null;

  return (
    <StudioLink href={`${APP_DEVELOPMENT_BASENAME}/${org}/${app}/app-upgrade`}>
      {t(noticeTextKey(status), { version: status.targetMajorVersion })}
    </StudioLink>
  );
};

const isUpgraded = (status: AppUpgradeStatus): boolean =>
  status.backendVersion !== null && !status.isUpgradeAvailable;

const noticeTextKey = (status: AppUpgradeStatus): string => {
  if (!status.activeUpgradeBranch) return 'app_upgrade.notice_available';
  return status.activeUpgradeHasPullRequest
    ? 'app_upgrade.notice_ready_for_testing'
    : 'app_upgrade.notice_in_progress';
};
