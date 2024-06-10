import { getRepoEditUrl } from '../../utils/urlUtils';
import { Link } from '@digdir/design-system-react';
import classes from './RepoList.module.css';
import React from 'react';
import { useTranslation } from 'react-i18next';

type RepoNameWithLinkProps = {
  repoFullName: string;
};

export const RepoNameWithLink = ({ repoFullName }: RepoNameWithLinkProps): React.ReactElement => {
  const { t } = useTranslation();

  const [org, repoName] = repoFullName.split('/');
  const isDatamodelling = repoFullName.endsWith('-datamodels');
  const editUrl = getRepoEditUrl({ org, repo: repoName });
  const editTextKey = t(isDatamodelling ? 'dashboard.edit_datamodels' : 'dashboard.edit_app');

  return (
    <Link className={classes.repoLink} href={editUrl} title={editTextKey}>
      {repoName}
    </Link>
  );
};

RepoNameWithLink.displayName = 'RepoNameWithLink';
