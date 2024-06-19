import { getRepoEditUrl } from '../../utils/urlUtils';
import { Link } from '@digdir/design-system-react';
import classes from './RepoNameWithLink.module.css';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { DATA_MODEL_REPO_IDENTIFIER } from '../../constants';

type RepoNameWithLinkProps = {
  repoFullName: string;
};

export const RepoNameWithLink = ({ repoFullName }: RepoNameWithLinkProps): React.ReactElement => {
  const { t } = useTranslation();

  const [org, repoName] = repoFullName.split('/');
  const isDataModelRepo = repoFullName.endsWith(DATA_MODEL_REPO_IDENTIFIER);
  const editUrl = getRepoEditUrl({ org, repo: repoName });
  const editTextKey = t(isDataModelRepo ? 'dashboard.edit_data_models' : 'dashboard.edit_app', {
    appName: repoName,
  });

  return (
    <Link className={classes.repoLink} href={editUrl} title={editTextKey}>
      {repoName}
    </Link>
  );
};
