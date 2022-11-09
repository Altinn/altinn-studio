import { createSelector } from 'reselect';
import { RootState } from '../../store';

const mergeConflictSelector = (state: RootState) => {
  return state.handleMergeConflict;
};

const getRepoStatus = () => {
  return createSelector([mergeConflictSelector], (mergeConflictState) => {
    return mergeConflictState.repoStatus;
  });
};

export const makeGetRepoStatusSelector = getRepoStatus;
