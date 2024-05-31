import { getRepoEditUrl } from '../../utils/urlUtils';
import { Link } from '@digdir/design-system-react';
import classes from './RepoList.module.css';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { RepositoryWithStarred } from '../../utils/repoUtils/repoUtils';

type RepoNameWithLinkProps = {
  repo: RepositoryWithStarred;
};

export const RepoNameWithLink = ({ repo }: RepoNameWithLinkProps): React.ReactElement => {
  const { t } = useTranslation();

  const repoFullName = repo.full_name as string;
  const [org, repoName] = repoFullName.split('/');
  const isDatamodelling = repoFullName.endsWith('-datamodels');
  const editUrl = getRepoEditUrl({ org, repo: repoName });
  const editTextKey = t(isDatamodelling ? 'dashboard.edit_datamodels' : 'dashboard.edit_service');

  return (
    <Link className={classes.repoLink} href={editUrl} title={editTextKey}>
      {repo.name}
    </Link>
  );
};
