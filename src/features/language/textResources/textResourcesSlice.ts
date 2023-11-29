import { resourcesAsMap } from 'src/features/language/textResources/resourcesAsMap';
import { createSagaSlice } from 'src/redux/sagaSlice';
import type { ITextResourceResult, ITextResourcesState } from 'src/features/language/textResources/index';
import type { ActionsFromSlice, MkActionType } from 'src/redux/sagaSlice';

const initialState: ITextResourcesState = {
  resourceMap: {},
};

export let TextResourcesActions: ActionsFromSlice<typeof textResourcesSlice>;
export const textResourcesSlice = () => {
  const slice = createSagaSlice((mkAction: MkActionType<ITextResourcesState>) => ({
    name: 'textResources',
    initialState,
    actions: {
      fetchFulfilled: mkAction<ITextResourceResult>({
        reducer: (state, action) => {
          state.resourceMap = resourcesAsMap(action.payload.resources);
        },
      }),
    },
  }));

  TextResourcesActions = slice.actions;
  return slice;
};
