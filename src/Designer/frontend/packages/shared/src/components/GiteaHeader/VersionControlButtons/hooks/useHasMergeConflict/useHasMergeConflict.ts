import { useState, useEffect } from 'react';
import { type RepoStatus } from 'app-shared/types/RepoStatus';

export const useHasMergeConflict = (repoStatus: RepoStatus) => {
  const [hasMergeConflict, setHasMergeConflict] = useState(false);

  useEffect(() => {
    if (repoStatus) {
      const repoHasMergeConflict =
        repoStatus.hasMergeConflict ||
        repoStatus.repositoryStatus === 'MergeConflict' ||
        repoStatus.repositoryStatus === 'CheckoutConflict';

      setHasMergeConflict(repoHasMergeConflict);
    }
  }, [repoStatus]);

  return { hasMergeConflict, setHasMergeConflict };
};
