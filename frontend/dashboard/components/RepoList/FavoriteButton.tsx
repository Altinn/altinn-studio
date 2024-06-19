import { StarFillIcon, StarIcon } from '@navikt/aksel-icons';
import { Button } from '@digdir/design-system-react';
import React from 'react';
import { useSetStarredRepoMutation, useUnsetStarredRepoMutation } from '../../hooks/mutations';
import type { RepositoryWithStarred } from '../../utils/repoUtils/repoUtils';
import { useTranslation } from 'react-i18next';

type FavoriteButtonProps = {
  repo: RepositoryWithStarred;
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
      {repo.hasStarred ? <StarFillIcon /> : <StarIcon />}
    </Button>
  );
};

FavoriteButton.displayName = 'FavoriteButton';
