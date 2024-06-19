import { useEffect, useState } from 'react';
import { type Repository } from 'app-shared/types/Repository';

export const useHasPushRights = (currentRepo: Repository) => {
  const [hasPushRights, setHasPushRights] = useState(false);

  useEffect(() => {
    if (currentRepo) {
      setHasPushRights(currentRepo.permissions.push);
    }
  }, [currentRepo]);

  return hasPushRights;
};
