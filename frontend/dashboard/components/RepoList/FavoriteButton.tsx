import { StarFillIcon, StarIcon } from '@navikt/aksel-icons';
import { Button } from '@digdir/design-system-react';
import React from 'react';
import { useSetStarredRepoMutation, useUnsetStarredRepoMutation } from '../../hooks/mutations';
import type { RepositoryWithStarred } from '../../utils/repoUtils/repoUtils';

type FavoriteButtonProps = {
  repo: RepositoryWithStarred;
};

export const FavoriteButton = ({ repo }: FavoriteButtonProps): React.ReactElement => {
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

  return (
    <Button onClick={(e) => handleToggleFav(e)} variant={'tertiary'} icon>
      {repo.hasStarred ? <StarFillIcon name='star-fill-icon' /> : <StarIcon name='star-icon' />}
    </Button>
  );
};
