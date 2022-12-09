import type { IRuntimeState } from 'src/types';

const dataListStateSelector = (state: IRuntimeState) => state.dataListState;

export const listStateSelector = (state: IRuntimeState) => {
  const dataListState = dataListStateSelector(state);

  return dataListState || {};
};
