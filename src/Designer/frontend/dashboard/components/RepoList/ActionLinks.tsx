import { StudioButton, StudioDropdownMenu } from '@studio/components-legacy';
import type { StudioButtonProps } from '@studio/components-legacy';
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

  const dropdownAnchorButtonProps: StudioButtonProps = {
    variant: 'tertiary',
    icon: <MenuElipsisVerticalIcon className={classes.akselIcon} />,
    title: t('dashboard.app_dropdown', {
      appName: repoName,
    }),
  };

  return (
    <div className={classes.actionLinksContainer}>
      <StudioButton
        title={t('dashboard.show_repo', {
          appName: repoName,
        })}
        variant='tertiary'
        className={classes.giteaButton}
        icon={giteaIconWithLink}
        size='medium'
      />
      <StudioButton
        title={t('dashboard.edit_app', {
          appName: repoName,
        })}
        variant='tertiary'
        className={classes.editButton}
        icon={editIconWithLink}
        size='medium'
      />
      <StudioDropdownMenu size='small' anchorButtonProps={dropdownAnchorButtonProps}>
        <StudioDropdownMenu.Item
          onClick={() => handleOpenCopyModal(repoFullName)}
          icon={<FilesIcon />}
        >
          {t('dashboard.make_copy')}
        </StudioDropdownMenu.Item>
        <StudioDropdownMenu.Item
          onClick={() => window.open(editUrl, '_blank')}
          icon={<ExternalLinkIcon />}
        >
          {t('dashboard.open_in_new')}
        </StudioDropdownMenu.Item>
      </StudioDropdownMenu>
      <MakeCopyModal
        onClose={handleCloseCopyModal}
        ref={copyModalRef}
        serviceFullName={copyCurrentRepoName}
      />
    </div>
  );
};
