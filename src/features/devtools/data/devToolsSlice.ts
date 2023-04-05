import { previewPdfSaga } from 'src/features/devtools/data/devToolsSagas';
import { createSagaSlice } from 'src/redux/sagaSlice';
import type { IDevToolsState } from 'src/features/devtools/data/types.d';
import type { ActionsFromSlice, MkActionType } from 'src/redux/sagaSlice';

export const initialState: IDevToolsState = {
  pdfPreview: false,
};

export let DevToolsActions: ActionsFromSlice<typeof devToolsSlice>;
export const devToolsSlice = () => {
  const slice = createSagaSlice((mkAction: MkActionType<IDevToolsState>) => ({
    name: 'devTools',
    initialState,
    actions: {
      previewPdf: mkAction<void>({
        takeEvery: previewPdfSaga,
      }),
      setPdfPreview: mkAction<{ preview: boolean }>({
        reducer: (state, action) => {
          const { preview } = action.payload;
          state.pdfPreview = preview;
        },
      }),
    },
  }));
  DevToolsActions = slice.actions;
  return slice;
};
