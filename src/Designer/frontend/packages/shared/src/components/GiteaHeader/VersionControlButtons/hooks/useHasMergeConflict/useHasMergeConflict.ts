import { useState, useEffect } from 'react';
import { type RepoStatus } from 'app-shared/types/RepoStatus';

export const useHasMergeConflict = (repoStatus: RepoStatus) => {
  const [hasMergeConflict, setHasMergeConflict] = useState(false);

  useEffect(() => {
    if (repoStatus) {
      setHasMergeConflict(repoStatus.hasMergeConflict);
    }
  }, [repoStatus]);

  return { hasMergeConflict, setHasMergeConflict };
};
