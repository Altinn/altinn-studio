import { getApplicationMetadataSaga } from 'src/features/applicationMetadata/getApplicationMetadataSaga';
import { createSagaSlice } from 'src/redux/sagaSlice';
import type {
  IApplicationMetadataState,
  IGetApplicationMetadataFulfilled,
  IGetApplicationMetadataRejected,
} from 'src/features/applicationMetadata/index';
import type { ActionsFromSlice, MkActionType } from 'src/redux/sagaSlice';

const initialState: IApplicationMetadataState = {
  applicationMetadata: null,
  error: null,
};

export let ApplicationMetadataActions: ActionsFromSlice<typeof applicationMetadataSlice>;
export const applicationMetadataSlice = () => {
  const slice = createSagaSlice((mkAction: MkActionType<IApplicationMetadataState>) => ({
    name: 'applicationMetadata',
    initialState,
    actions: {
      get: mkAction<void>({
        takeLatest: getApplicationMetadataSaga,
      }),
      getFulfilled: mkAction<IGetApplicationMetadataFulfilled>({
        reducer: (state, action) => {
          state.applicationMetadata = action.payload.applicationMetadata;
          state.error = null;
        },
      }),
      getRejected: mkAction<IGetApplicationMetadataRejected>({
        reducer: (state, action) => {
          state.error = action.payload.error;
        },
      }),
    },
  }));

  ApplicationMetadataActions = slice.actions;
  return slice;
};
