import { StarFillIcon, StarIcon } from '@navikt/aksel-icons';
import { Button } from '@digdir/designsystemet-react';
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

  return (
    <Button title={title} onClick={handleToggleFav} variant={'tertiary'} icon>
      {repo.hasStarred ? (
        <StarFillIcon className={classes.favoriteIcon} />
      ) : (
        <StarIcon className={classes.favoriteIcon} />
      )}
    </Button>
  );
};

FavoriteButton.displayName = 'FavoriteButton';
