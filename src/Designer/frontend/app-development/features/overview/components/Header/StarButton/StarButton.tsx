import React, { useMemo } from 'react';
import { StudioButton } from '@studio/components';
import { StarFillIcon, StarIcon } from '@studio/icons';
import { useRepoMetadataQuery } from 'app-shared/hooks/queries';
import { useStarredReposQuery } from 'dashboard/hooks/queries';
import {
  useSetStarredRepoMutation,
  useUnsetStarredRepoMutation,
} from 'dashboard/hooks/mutations';
import { useTranslation } from 'react-i18next';
import classes from './StarButton.module.css';

type StarButtonProps = {
  org: string;
  app: string;
  appName?: string;
};

export const StarButton = ({ org, app, appName }: StarButtonProps): React.ReactElement | null => {
  const { t } = useTranslation();
  const { data: repoMetadata } = useRepoMetadataQuery(org, app);
  const { data: starredRepos = [] } = useStarredReposQuery();
  const { mutate: setStarredRepo } = useSetStarredRepoMutation();
  const { mutate: unsetStarredRepo } = useUnsetStarredRepoMutation();

  const isStarred = useMemo(() => {
    if (!repoMetadata || !starredRepos) return false;
    return starredRepos.some((repo) => repo.id === repoMetadata.id);
  }, [repoMetadata, starredRepos]);

  const handleToggleStar = () => {
    if (!repoMetadata) return;
    if (isStarred) {
      unsetStarredRepo(repoMetadata);
    } else {
      setStarredRepo(repoMetadata);
    }
  };

  if (!repoMetadata) {
    return null;
  }

  const title = t(isStarred ? 'dashboard.unstar' : 'dashboard.star', {
    appName: appName || app,
  });

  const icon = isStarred ? (
    <StarFillIcon className={classes.starIcon} />
  ) : (
    <StarIcon className={classes.starIcon} />
  );

  return <StudioButton title={title} onClick={handleToggleStar} variant='tertiary' icon={icon} />;
};
