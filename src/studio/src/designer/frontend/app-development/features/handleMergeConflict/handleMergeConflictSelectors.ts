import { createSelector } from 'reselect';

const mergeConflictSelector = (state: any) => {
  return state.handleMergeConflict;
};

const getRepoStatus = () => {
  return createSelector(
    [mergeConflictSelector],
    (mergeConflictState) => {
      return mergeConflictState.repoStatus;
    },
  );
};

export const makeGetRepoStatusSelector = getRepoStatus;
