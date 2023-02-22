import { fetchFooterLayoutSaga } from 'src/features/footer/data/fetchFooterLayoutSagas';
import { createSagaSlice } from 'src/shared/resources/utils/sagaSlice';
import type {
  IFetchFooterLayoutFulfilled,
  IFooterLayoutActionRejected,
  IFooterLayoutState,
} from 'src/features/footer/data/types';
import type { MkActionType } from 'src/shared/resources/utils/sagaSlice';

export const initialState: IFooterLayoutState = {
  footerLayout: null,
  error: null,
};

export const footerLayoutSlice = createSagaSlice((mkAction: MkActionType<IFooterLayoutState>) => ({
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

export const FooterLayoutActions = footerLayoutSlice.actions;
