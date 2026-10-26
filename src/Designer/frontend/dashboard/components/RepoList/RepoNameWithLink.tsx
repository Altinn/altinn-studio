import { getRepositoryEditUrl } from 'app-shared/utils/repository';
import { StudioLink } from '@studio/components';
import classes from './RepoNameWithLink.module.css';
import React from 'react';
import { useTranslation } from 'react-i18next';

type RepoNameWithLinkProps = {
  repoFullName: string;
};

export const RepoNameWithLink = ({ repoFullName }: RepoNameWithLinkProps): React.ReactElement => {
  const { t } = useTranslation();

  const [org, repoName] = repoFullName.split('/');
  const editUrl = getRepositoryEditUrl(org, repoName);

  return (
    <StudioLink
      className={classes.repoLink}
      href={editUrl}
      title={t('dashboard.edit_app', {
        appName: repoName,
      })}
    >
      {repoName}
    </StudioLink>
  );
};
