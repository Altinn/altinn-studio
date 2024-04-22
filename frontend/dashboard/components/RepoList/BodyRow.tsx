import { Button, Table } from '@digdir/design-system-react';
import React from 'react';
import { RepositoryWithStarred } from '../../utils/repoUtils/repoUtils';
import { DateUtils } from '@studio/pure-functions';
import { ActionLinks } from './ActionLinks';
import classes from './RepoList.module.css';
import { StarFillIcon, StarIcon } from '@navikt/aksel-icons';
import { useSetStarredRepoMutation, useUnsetStarredRepoMutation } from '../../hooks/mutations';
import { getRepoEditUrl } from '../../utils/urlUtils';
import { useTranslation } from 'react-i18next';

interface BodyRowProps {
  repo: RepositoryWithStarred;
}

export const BodyRow: React.FC<BodyRowProps> = ({ repo }) => {
  const { t } = useTranslation();
  const { mutate: setStarredRepo } = useSetStarredRepoMutation();
  const { mutate: unsetStarredRepo } = useUnsetStarredRepoMutation();

  const handleToggleFav = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (repo.hasStarred) {
      unsetStarredRepo(repo);
    } else {
      setStarredRepo(repo);
    }
  };

  const repoFullName = repo.full_name as string;
  const [org, repoName] = repoFullName.split('/');
  const isDatamodelling = repoFullName.endsWith('-datamodels');
  const editUrl = getRepoEditUrl({ org, repo: repoName });
  const editTextKey = t(isDatamodelling ? 'dashboard.edit_datamodels' : 'dashboard.edit_service');

  return (
    <Table.Row
      title={editTextKey}
      onClick={() => (window.location.href = editUrl)}
      className={classes.bodyRow}
    >
      <Table.Cell className={classes.favoriteCell}>
        <Button onClick={(e) => handleToggleFav(e)} variant={'tertiary'} icon>
          {repo.hasStarred ? (
            <StarFillIcon name='star-fill-icon' className={classes.favoriteIcon} />
          ) : (
            <StarIcon name='star-icon' className={classes.dropdownIcon} />
          )}
        </Button>
      </Table.Cell>
      <Table.Cell>{repo.name}</Table.Cell>
      <Table.Cell>{repo.owner.full_name || repo.owner.login}</Table.Cell>
      <Table.Cell>{DateUtils.formatDateDDMMYYYY(repo.updated_at)}</Table.Cell>
      <Table.Cell>{repo.description}</Table.Cell>
      <Table.Cell className={classes.actionButtonContainer}>
        <ActionLinks repo={repo} />
      </Table.Cell>
    </Table.Row>
  );
};
