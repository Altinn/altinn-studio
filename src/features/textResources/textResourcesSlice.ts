import { resourcesAsMap } from 'src/features/textResources/resourcesAsMap';
import { createSagaSlice } from 'src/redux/sagaSlice';
import type {
  IFetchTextResourcesRejected,
  ITextResourceResult,
  ITextResourcesState,
} from 'src/features/textResources/index';
import type { ActionsFromSlice, MkActionType } from 'src/redux/sagaSlice';

const initialState: ITextResourcesState = {
  language: null,
  resourceMap: {},
  error: null,
};

export let TextResourcesActions: ActionsFromSlice<typeof textResourcesSlice>;
export const textResourcesSlice = () => {
  const slice = createSagaSlice((mkAction: MkActionType<ITextResourcesState>) => ({
    name: 'textResources',
    initialState,
    actions: {
      fetchFulfilled: mkAction<ITextResourceResult>({
        reducer: (state, action) => {
          state.language = action.payload.language;
          state.resourceMap = resourcesAsMap(action.payload.resources);
        },
      }),
      fetchRejected: mkAction<IFetchTextResourcesRejected>({
        reducer: (state, action) => {
          state.error = action.payload.error;
        },
      }),
    },
  }));

  TextResourcesActions = slice.actions;
  return slice;
};
