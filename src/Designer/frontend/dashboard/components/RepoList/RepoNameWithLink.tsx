import { getRepoEditUrl } from '../../utils/urlUtils';
import { Link } from '@digdir/designsystemet-react';
import classes from './RepoNameWithLink.module.css';
import React from 'react';
import { useTranslation } from 'react-i18next';

type RepoNameWithLinkProps = {
  repoFullName: string;
};

export const RepoNameWithLink = ({ repoFullName }: RepoNameWithLinkProps): React.ReactElement => {
  const { t } = useTranslation();

  const [org, repoName] = repoFullName.split('/');
  const editUrl = getRepoEditUrl({ org, repo: repoName });

  return (
    <Link
      className={classes.repoLink}
      href={editUrl}
      title={t('dashboard.edit_app', {
        appName: repoName,
      })}
    >
      {repoName}
    </Link>
  );
};
