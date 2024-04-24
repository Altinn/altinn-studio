import { Button, DropdownMenu } from '@digdir/design-system-react';
import React from 'react';
import classes from './NewRepoList.module.css';
import cn from 'classnames';
import {
  ExternalLinkIcon,
  FilesIcon,
  MenuElipsisVerticalIcon,
  PencilIcon,
} from '@navikt/aksel-icons';
import { useTranslation } from 'react-i18next';
import { getRepoEditUrl } from '../../utils/urlUtils';
import { Repository } from 'app-shared/types/Repository';

interface ActionLinksProps {
  repo: Repository;
}

export const ActionLinks: React.FC<ActionLinksProps> = ({ repo }) => {
  const { t } = useTranslation();

  const repoFullName = repo.full_name as string;
  const [org, repoName] = repoFullName.split('/');
  const isDatamodelling = repoFullName.endsWith('-datamodels');
  const editUrl = getRepoEditUrl({ org, repo: repoName });
  const editTextKey = t(isDatamodelling ? 'dashboard.edit_datamodels' : 'dashboard.edit_service');

  return (
    <div className={classes.actionLinks}>
      <Button
        onClick={(e) => e.stopPropagation()}
        variant={'tertiary'}
        icon
        className={classes.repoButton}
        asChild
      >
        <a href={repo.html_url} title={t('dashboard.repository_in_list', { appName: repoName })}>
          <i className={cn('fa fa-gitea', classes.repoIcon)} />
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
          <DropdownMenu.Item>
            {<FilesIcon />}
            {t('dashboard.make_copy')}
          </DropdownMenu.Item>
          <DropdownMenu.Item>
            {<ExternalLinkIcon />}
            {t('dashboard.open_in_new')}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>
    </div>
  );
};
