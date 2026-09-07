import React from 'react';
import { useNavigate } from 'react-router-dom';
import { StudioButton } from '@studio/components';
import { useTranslation } from 'react-i18next';
import type { Repository } from 'app-shared/types/Repository';
import { useAppUpgradeStatusQuery } from '../../hooks/queries/useAppUpgradeStatusQuery';
import { useSelectedContext } from '../../hooks/useSelectedContext';
import { useSubroute } from '../../hooks/useSubRoute';
import { getAppUpgradePath } from '../../utils/urlUtils';
import classes from './UpgradeNotice.module.css';

type UpgradeNoticeProps = {
  repo: Repository;
};

export const UpgradeNotice = ({ repo }: UpgradeNoticeProps): React.ReactElement | null => {
  const { t } = useTranslation();
  const [org, app] = repo.full_name.split('/');
  const { data: status } = useAppUpgradeStatusQuery(org, app);
  const navigate = useNavigate();
  const selectedContext = useSelectedContext();
  const subroute = useSubroute();

  if (!status?.isUpgradeAvailable) return null;

  return (
    <StudioButton
      variant='tertiary'
      data-size='sm'
      className={classes.noticeButton}
      onClick={() => navigate(getAppUpgradePath({ subroute, selectedContext, org, app }))}
    >
      {t(
        status.hasCustomCode || !status.isAutomaticUpgradeSupported
          ? 'app_upgrade.notice_available'
          : 'app_upgrade.notice_automatic_available',
      )}
    </StudioButton>
  );
};

export const AppVersions = ({ repo }: UpgradeNoticeProps): React.ReactElement | null => {
  const { t } = useTranslation();
  const [org, app] = repo.full_name.split('/');
  const { data: status } = useAppUpgradeStatusQuery(org, app);

  if (!status?.backendVersion) return null;

  const frontend = status.frontendVersion
    ? `v${status.frontendVersion}`
    : t('app_upgrade.versions_unknown');
  return <span className={classes.versions}>{`${frontend} / v${status.backendVersion}`}</span>;
};
