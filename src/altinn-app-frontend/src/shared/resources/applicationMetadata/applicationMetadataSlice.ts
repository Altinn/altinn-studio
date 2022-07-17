import type {
  IApplicationMetadataState,
  IGetApplicationMetadataRejected,
  IGetApplicationMetadataFulfilled,
} from 'src/shared/resources/applicationMetadata/index';
import type { MkActionType } from 'src/shared/resources/utils/sagaSlice';
import { createSagaSlice } from 'src/shared/resources/utils/sagaSlice';
import { getApplicationMetadata } from 'src/shared/resources/applicationMetadata/sagas/get';

const initialState: IApplicationMetadataState = {
  applicationMetadata: null,
  error: null,
};

const applicationMetadataSlice = createSagaSlice(
  (mkAction: MkActionType<IApplicationMetadataState>) => ({
    name: 'applicationMetadata',
    initialState,
    actions: {
      get: mkAction<void>({
        takeLatest: getApplicationMetadata,
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
  }),
);

export const ApplicationMetadataActions = applicationMetadataSlice.actions;
export default applicationMetadataSlice;
