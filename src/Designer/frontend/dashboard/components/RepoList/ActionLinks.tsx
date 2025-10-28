import { StudioDropdown, StudioButton } from '@studio/components';
import React, { useRef, useState } from 'react';
import classes from './ActionLinks.module.css';
import {
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

type ActionLinksProps = {
  repo: Repository;
};

export const ActionLinks = ({ repo }: ActionLinksProps): React.ReactElement => {
  const { t } = useTranslation();
  const [copyCurrentRepoName, setCopyCurrentRepoName] = useState('');
  const copyModalRef = useRef<HTMLDialogElement>(null);

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
      <StudioDropdown triggerButtonVariant='tertiary' icon={<MenuElipsisVerticalIcon />}>
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
        </StudioDropdown.List>
      </StudioDropdown>
      <MakeCopyModal
        onClose={handleCloseCopyModal}
        ref={copyModalRef}
        serviceFullName={copyCurrentRepoName}
      />
    </div>
  );
};
