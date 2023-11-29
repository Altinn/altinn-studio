import { createSagaSlice } from 'src/redux/sagaSlice';
import type {
  IApplicationMetadataState,
  IGetApplicationMetadataFulfilled,
} from 'src/features/applicationMetadata/index';
import type { ActionsFromSlice, MkActionType } from 'src/redux/sagaSlice';

const initialState: IApplicationMetadataState = {
  applicationMetadata: null,
};

export let ApplicationMetadataActions: ActionsFromSlice<typeof applicationMetadataSlice>;
export const applicationMetadataSlice = () => {
  const slice = createSagaSlice((mkAction: MkActionType<IApplicationMetadataState>) => ({
    name: 'applicationMetadata',
    initialState,
    actions: {
      getFulfilled: mkAction<IGetApplicationMetadataFulfilled>({
        reducer: (state, action) => {
          state.applicationMetadata = action.payload.applicationMetadata;
        },
      }),
    },
  }));

  ApplicationMetadataActions = slice.actions;
  return slice;
};
