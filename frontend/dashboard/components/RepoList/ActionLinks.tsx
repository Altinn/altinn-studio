import { Button, DropdownMenu } from '@digdir/designsystemet-react';
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
  const isDataModelRepo = repoFullName.endsWith(DATA_MODEL_REPO_IDENTIFIER);
  const editUrl = getRepoEditUrl({ org, repo: repoName });
  const editTextKey = t(isDataModelRepo ? 'dashboard.edit_data_models' : 'dashboard.edit_app', {
    appName: repoName,
  });

  return (
    <div className={classes.actionLinksContainer} ref={copyModalAnchorRef}>
      <Button variant={'tertiary'} className={classes.giteaButton} icon asChild>
        <a
          href={repo.html_url}
          title={t('dashboard.show_repo', {
            appName: repoName,
          })}
        >
          <i className={cn('fa fa-gitea', classes.giteaIcon)} />
        </a>
      </Button>
      <Button variant={'tertiary'} icon asChild>
        <a href={editUrl} title={editTextKey}>
          <PencilIcon className={classes.nativeActionIcon} />
        </a>
      </Button>
      <DropdownMenu size={'small'}>
        <DropdownMenu.Trigger
          variant={'tertiary'}
          title={t('dashboard.app_dropdown', {
            appName: repoName,
          })}
          asChild
        >
          <Button variant={'tertiary'} icon>
            <MenuElipsisVerticalIcon className={classes.nativeActionIcon} />
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
