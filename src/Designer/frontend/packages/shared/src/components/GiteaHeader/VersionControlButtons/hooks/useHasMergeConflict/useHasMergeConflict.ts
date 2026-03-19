import { useState, useEffect } from 'react';
import { type RepoStatus } from 'app-shared/types/RepoStatus';
import { hasRepoMergeConflict } from '../../utils/repoStatus';

export const useHasMergeConflict = (repoStatus: RepoStatus) => {
  const [hasMergeConflict, setHasMergeConflict] = useState(false);

  useEffect(() => {
    if (repoStatus) {
      setHasMergeConflict(hasRepoMergeConflict(repoStatus));
    }
  }, [repoStatus]);

  return { hasMergeConflict, setHasMergeConflict };
};
