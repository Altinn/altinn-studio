import { createSelector } from 'reselect';

import type { RootState } from 'src/store';
import type { ITracks } from 'src/types';

/**
 * Given the ITracks state, this returns the final order for layouts
 */
export function getLayoutOrderFromTracks(tracks: ITracks): string[] | null {
  if (tracks.order === null) {
    return null;
  }

  const hiddenSet = new Set(tracks.hidden);
  return [...tracks.order].filter((layout) => !hiddenSet.has(layout));
}

const selectTracks = (state: RootState) => state.formLayout.uiConfig.tracks;

export const selectLayoutOrder = createSelector(selectTracks, (tracks) =>
  getLayoutOrderFromTracks(tracks),
);
