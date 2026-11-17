import { useState, useEffect } from 'react';
import { type RepoStatus } from 'app-shared/types/RepoStatus';
import { isMergeConflict } from '../../utils/repoStatus';

export const useHasMergeConflict = (repoStatus: RepoStatus) => {
  const [hasMergeConflict, setHasMergeConflict] = useState(false);

  useEffect(() => {
    if (repoStatus) {
      setHasMergeConflict(isMergeConflict(repoStatus));
    }
  }, [repoStatus]);

  return { hasMergeConflict, setHasMergeConflict };
};
