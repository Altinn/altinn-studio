import { DropdownMenu } from '@digdir/design-system-react';
import { StudioButton, StudioDropdownMenu } from '@studio/components';
import type { StudioButtonProps } from '@studio/components';
import React, { useRef, useState } from 'react';
import classes from './ActionLinks.module.css';
import cn from 'classnames';
import {
  ExternalLinkIcon,
  FilesIcon,
  MenuElipsisVerticalIcon,
  PencilIcon,
} from '@navikt/aksel-icons';
import { useTranslation } from 'react-i18next';
import { getRepoEditUrl } from '../../utils/urlUtils';
import type { Repository } from 'app-shared/types/Repository';
import { MakeCopyModal } from '../MakeCopyModal';
import { DATA_MODEL_REPO_IDENTIFIER } from '../../constants';

type ActionLinksProps = {
  repo: Repository;
};

export const ActionLinks = ({ repo }: ActionLinksProps): React.ReactElement => {
  const { t } = useTranslation();
  const [copyCurrentRepoName, setCopyCurrentRepoName] = useState('');
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const copyModalAnchorRef = useRef(null);

  const handleOpenCopyModal = (repoFullName: string) => {
    setModalOpen(true);
    setCopyCurrentRepoName(repoFullName);
  };

  const handleCloseCopyModal = () => {
    setModalOpen(false);
    setCopyCurrentRepoName(null);
  };

  const repoFullName = repo.full_name;
  const [org, repoName] = repoFullName.split('/');
  const editUrl = getRepoEditUrl({ org, repo: repoName });

  const giteaIconWithLink = (
    <a
      href={repo.html_url}
      title={t('dashboard.show_repo', {
        appName: repoName,
      })}
    >
      <span className={cn('fa fa-gitea', classes.giteaIcon)} />
    </a>
  );

  const editIconWithLink = (
    <a
      href={editUrl}
      title={t('dashboard.edit_app', {
        appName: repoName,
      })}
    >
      <PencilIcon className={classes.nativeActionIcon} />
    </a>
  );

  const dropdownAnchorButtonProps = {
    variant: 'tertiary' as StudioButtonProps['variant'],
    icon: <MenuElipsisVerticalIcon className={classes.nativeActionIcon} />,
    title: t('dashboard.app_dropdown', {
      appName: repoName,
    }),
  };

  return (
    <div className={classes.actionLinksContainer} ref={copyModalAnchorRef}>
      <StudioButton
        variant={'tertiary'}
        className={classes.giteaButton}
        icon={giteaIconWithLink}
        asChild
      />
      <StudioButton
        variant={'tertiary'}
        className={classes.editButton}
        icon={editIconWithLink}
        asChild
      />
      <StudioDropdownMenu size={'small'} anchorButtonProps={dropdownAnchorButtonProps}>
        <DropdownMenu.Item onClick={() => handleOpenCopyModal(repoFullName)}>
          {<FilesIcon />}
          {t('dashboard.make_copy')}
        </DropdownMenu.Item>
        <DropdownMenu.Item onClick={() => window.open(editUrl, '_blank')}>
          {<ExternalLinkIcon />}
          {t('dashboard.open_in_new')}
        </DropdownMenu.Item>
      </StudioDropdownMenu>
      {copyCurrentRepoName && (
        <MakeCopyModal
          ref={copyModalAnchorRef}
          open={modalOpen}
          onClose={handleCloseCopyModal}
          serviceFullName={copyCurrentRepoName}
        />
      )}
    </div>
  );
};
