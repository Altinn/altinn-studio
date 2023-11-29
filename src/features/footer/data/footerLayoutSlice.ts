import { createSagaSlice } from 'src/redux/sagaSlice';
import type { IFetchFooterLayoutFulfilled, IFooterLayoutState } from 'src/features/footer/data/types';
import type { ActionsFromSlice, MkActionType } from 'src/redux/sagaSlice';

export const initialState: IFooterLayoutState = {
  footerLayout: null,
};

export let FooterLayoutActions: ActionsFromSlice<typeof footerLayoutSlice>;
export const footerLayoutSlice = () => {
  const slice = createSagaSlice((mkAction: MkActionType<IFooterLayoutState>) => ({
    name: 'footerLayout',
    initialState,
    actions: {
      fetchFulfilled: mkAction<IFetchFooterLayoutFulfilled>({
        reducer: (state, action) => {
          const { footerLayout } = action.payload;
          state.footerLayout = footerLayout;
        },
      }),
    },
  }));
  FooterLayoutActions = slice.actions;
  return slice;
};
