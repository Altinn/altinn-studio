import React, { useRef } from 'react';
import { StudioButton } from '@studio/components';
import { useTranslation } from 'react-i18next';
import type { Repository } from 'app-shared/types/Repository';
import { useAppUpgradeStatusQuery } from '../../hooks/queries/useAppUpgradeStatusQuery';
import { AppUpgradeDialog } from '../AppUpgradeDialog';
import classes from './UpgradeNotice.module.css';

type UpgradeNoticeProps = {
  repo: Repository;
};

export const UpgradeNotice = ({ repo }: UpgradeNoticeProps): React.ReactElement => {
  const { t } = useTranslation();
  const [org, app] = repo.full_name.split('/');
  const { data: status } = useAppUpgradeStatusQuery(org, app);
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      {status?.isUpgradeAvailable && (
        <StudioButton
          variant='tertiary'
          data-size='sm'
          className={classes.noticeButton}
          onClick={() => dialogRef.current?.showModal()}
        >
          {t(
            status.hasCustomCode || !status.isAutomaticUpgradeSupported
              ? 'app_upgrade.notice_available'
              : 'app_upgrade.notice_automatic_available',
          )}
        </StudioButton>
      )}
      <AppUpgradeDialog ref={dialogRef} org={org} app={app} />
    </>
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
