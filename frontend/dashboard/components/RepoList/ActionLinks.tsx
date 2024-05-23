import { Button, DropdownMenu } from '@digdir/design-system-react';
import React, { useRef, useState } from 'react';
import classes from './RepoList.module.css';
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

type ActionLinksProps = {
  repo: Repository;
};

export const ActionLinks = ({ repo }: ActionLinksProps): React.ReactElement => {
  const { t } = useTranslation();
  const [copyCurrentRepoName, setCopyCurrentRepoName] = useState('');
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const copyModalAnchorRef = useRef(null);

  const handleOpenCopyModal = (repoFullName) => {
    setModalOpen(true);
    setCopyCurrentRepoName(repoFullName);
  };

  const handleCloseCopyModal = () => {
    setModalOpen(false);
    setCopyCurrentRepoName(null);
  };

  const repoFullName = repo.full_name as string;
  const [org, repoName] = repoFullName.split('/');
  const isDatamodelling = repoFullName.endsWith('-datamodels');
  const editUrl = getRepoEditUrl({ org, repo: repoName });
  const editTextKey = t(isDatamodelling ? 'dashboard.edit_datamodels' : 'dashboard.edit_service');

  return (
    <div className={classes.actionLinks} ref={copyModalAnchorRef}>
      <Button
        onClick={(e) => e.stopPropagation()}
        variant={'tertiary'}
        icon
        className={classes.giteaButton}
        asChild
      >
        <a href={repo.html_url} title={t('dashboard.repository_in_list', { appName: repoName })}>
          <i className={cn('fa fa-gitea', classes.giteaIcon)} />
        </a>
      </Button>
      <Button variant={'tertiary'} icon asChild>
        <a href={editUrl} title={editTextKey}>
          <PencilIcon title={t('dashboard.edit_app_icon')} />
        </a>
      </Button>
      <DropdownMenu size={'small'}>
        <DropdownMenu.Trigger variant={'tertiary'} asChild>
          <Button onClick={(e) => e.stopPropagation()} variant={'tertiary'} icon>
            <MenuElipsisVerticalIcon className={classes.dropdownIcon} />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item onClick={() => handleOpenCopyModal(repoFullName)}>
            {<FilesIcon />}
            {t('dashboard.make_copy')}
          </DropdownMenu.Item>
          <DropdownMenu.Item onClick={() => window.open(editUrl, '_blank')}>
            {<ExternalLinkIcon />}
            {t('dashboard.open_in_new')}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>
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
