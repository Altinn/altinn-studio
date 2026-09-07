import { StudioDropdown, StudioButton } from '@studio/components';
import React, { useRef, useState } from 'react';
import classes from './ActionLinks.module.css';
import {
  ArrowCirclepathIcon,
  ExternalLinkIcon,
  FilesIcon,
  GiteaIcon,
  MenuElipsisVerticalIcon,
  PencilIcon,
} from '@studio/icons';
import { useTranslation } from 'react-i18next';
import { getRepoEditUrl } from '../../utils/urlUtils';
import type { Repository } from 'app-shared/types/Repository';
import { MakeCopyModal } from '../MakeCopyModal';
import { AppUpgradeDialog } from '../AppUpgradeDialog';
import { FeatureFlag, useFeatureFlag } from '@studio/feature-flags';
import { NEXT_V9_VERSION } from 'app-shared/constants';

type ActionLinksProps = {
  repo: Repository;
};

export const ActionLinks = ({ repo }: ActionLinksProps): React.ReactElement => {
  const { t } = useTranslation();
  const [copyCurrentRepoName, setCopyCurrentRepoName] = useState('');
  const copyModalRef = useRef<HTMLDialogElement>(null);
  const upgradeDialogRef = useRef<HTMLDialogElement>(null);
  const isUpgradeHelperEnabled = useFeatureFlag(FeatureFlag.AppUpgradeHelper);

  const handleOpenCopyModal = (repoFullName: string) => {
    copyModalRef.current?.showModal();
    setCopyCurrentRepoName(repoFullName);
  };

  const handleCloseCopyModal = () => {
    setCopyCurrentRepoName(null);
  };

  const repoFullName = repo.full_name;
  const [org, repoName] = repoFullName.split('/');
  const editUrl = getRepoEditUrl({ org, repo: repoName });

  const giteaIconWithLink = (
    <a href={repo.html_url}>
      <GiteaIcon className={classes.giteaIcon} />
    </a>
  );

  const editIconWithLink = (
    <a href={editUrl}>
      <PencilIcon className={classes.akselIcon} />
    </a>
  );

  return (
    <div className={classes.actionLinksContainer}>
      <StudioButton
        title={t('dashboard.show_repo', {
          appName: repoName,
        })}
        variant='tertiary'
        className={classes.giteaButton}
        icon={giteaIconWithLink}
      />
      <StudioButton
        title={t('dashboard.edit_app', {
          appName: repoName,
        })}
        variant='tertiary'
        className={classes.editButton}
        icon={editIconWithLink}
      />
      <StudioDropdown
        triggerButtonVariant='tertiary'
        icon={<MenuElipsisVerticalIcon />}
        triggerButtonAriaLabel={t('dashboard.app_dropdown', { appName: repoName })}
      >
        <StudioDropdown.List>
          <StudioDropdown.Item>
            <StudioDropdown.Button
              icon={<FilesIcon />}
              onClick={() => handleOpenCopyModal(repoFullName)}
            >
              {t('dashboard.make_copy')}
            </StudioDropdown.Button>
          </StudioDropdown.Item>
          <StudioDropdown.Item>
            <StudioDropdown.Button
              icon={<ExternalLinkIcon />}
              onClick={() => window.open(editUrl, '_blank')}
            >
              {t('dashboard.open_in_new')}
            </StudioDropdown.Button>
          </StudioDropdown.Item>
          {isUpgradeHelperEnabled && (
            <StudioDropdown.Item>
              <StudioDropdown.Button
                icon={<ArrowCirclepathIcon />}
                onClick={() => upgradeDialogRef.current?.showModal()}
              >
                {t('app_upgrade.menu_item', { version: NEXT_V9_VERSION })}
              </StudioDropdown.Button>
            </StudioDropdown.Item>
          )}
        </StudioDropdown.List>
      </StudioDropdown>
      {isUpgradeHelperEnabled && (
        <AppUpgradeDialog ref={upgradeDialogRef} org={org} app={repoName} />
      )}
      <MakeCopyModal
        onClose={handleCloseCopyModal}
        ref={copyModalRef}
        serviceFullName={copyCurrentRepoName}
      />
    </div>
  );
};
