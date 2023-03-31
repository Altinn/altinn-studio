import { fetchFooterLayoutSaga } from 'src/features/footer/data/fetchFooterLayoutSagas';
import { createSagaSlice } from 'src/redux/sagaSlice';
import type {
  IFetchFooterLayoutFulfilled,
  IFooterLayoutActionRejected,
  IFooterLayoutState,
} from 'src/features/footer/data/types';
import type { ActionsFromSlice, MkActionType } from 'src/redux/sagaSlice';

export const initialState: IFooterLayoutState = {
  footerLayout: null,
  error: null,
};

export let FooterLayoutActions: ActionsFromSlice<typeof footerLayoutSlice>;
export const footerLayoutSlice = () => {
  const slice = createSagaSlice((mkAction: MkActionType<IFooterLayoutState>) => ({
    name: 'footerLayout',
    initialState,
    actions: {
      fetch: mkAction<void>({
        takeLatest: fetchFooterLayoutSaga,
      }),
      fetchFulfilled: mkAction<IFetchFooterLayoutFulfilled>({
        reducer: (state, action) => {
          const { footerLayout } = action.payload;
          state.footerLayout = footerLayout;
        },
      }),
      fetchRejected: mkAction<IFooterLayoutActionRejected>({
        reducer: (state, action) => {
          const { error } = action.payload;
          state.error = error;
        },
      }),
    },
  }));
  FooterLayoutActions = slice.actions;
  return slice;
};
