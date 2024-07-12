import { StarFillIcon, StarIcon } from '@navikt/aksel-icons';
import { StudioButton } from '@studio/components';
import React from 'react';
import { useSetStarredRepoMutation, useUnsetStarredRepoMutation } from '../../hooks/mutations';
import type { RepoIncludingStarredData } from '../../utils/repoUtils/repoUtils';
import { useTranslation } from 'react-i18next';
import classes from './FavoriteButton.module.css';

type FavoriteButtonProps = {
  repo: RepoIncludingStarredData;
};

export const FavoriteButton = ({ repo }: FavoriteButtonProps): React.ReactElement => {
  const { t } = useTranslation();
  const { mutate: setStarredRepo } = useSetStarredRepoMutation();
  const { mutate: unsetStarredRepo } = useUnsetStarredRepoMutation();

  const handleToggleFav = () => {
    if (repo.hasStarred) {
      unsetStarredRepo(repo);
    } else {
      setStarredRepo(repo);
    }
  };

  const title = t(repo.hasStarred ? 'dashboard.unstar' : 'dashboard.star', {
    appName: repo.name,
  });

  return repo.hasStarred ? (
    <StudioButton
      title={title}
      onClick={handleToggleFav}
      variant='tertiary'
      icon={<StarFillIcon className={classes.favoriteIcon} />}
    />
  ) : (
    <StudioButton
      title={title}
      onClick={handleToggleFav}
      variant='tertiary'
      icon={<StarIcon className={classes.favoriteIcon} />}
    />
  );
};

FavoriteButton.displayName = 'FavoriteButton';
