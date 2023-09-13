import { createSelector } from 'reselect';

import { buildInstanceContext } from 'src/utils/instanceContext';
import type { IRuntimeState } from 'src/types';

const instanceSelector = (state: IRuntimeState) => state.instanceData?.instance;

export const selectInstanceContext = createSelector(instanceSelector, buildInstanceContext);
