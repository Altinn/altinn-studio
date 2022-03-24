import { createSelector } from 'reselect';
import type { IServiceDevelopmentState } from '../../types/global';

const mergeConflictSelector = (state: IServiceDevelopmentState) => {
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
