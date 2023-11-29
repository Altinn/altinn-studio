import { createSagaSlice } from 'src/redux/sagaSlice';
import type { IFetchProfileFulfilled, IProfileState } from 'src/features/profile/index';
import type { ActionsFromSlice, MkActionType } from 'src/redux/sagaSlice';

export const initialState: IProfileState = {};

export let ProfileActions: ActionsFromSlice<typeof profileSlice>;
export const profileSlice = () => {
  const slice = createSagaSlice((mkAction: MkActionType<IProfileState>) => ({
    name: 'profile',
    initialState,
    actions: {
      fetchFulfilled: mkAction<IFetchProfileFulfilled>({
        reducer: (state, action) => {
          state.profile = action.payload.profile;
        },
      }),
    },
  }));

  ProfileActions = slice.actions;
  return slice;
};
