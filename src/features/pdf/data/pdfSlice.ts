import { watchInitialPdfSaga, watchPdfPreviewSaga, watchPdfReadySaga } from 'src/features/pdf/data/generatePdfSagas';
import { createSagaSlice } from 'src/redux/sagaSlice';
import type { IPdfActionRejected, IPdfFormatFulfilled, IPdfState } from 'src/features/pdf/data/types';
import type { IPdfMethodFulfilled } from 'src/features/pdf/data/types.d';
import type { ActionsFromSlice, MkActionType } from 'src/redux/sagaSlice';

export const initialState: IPdfState = {
  readyForPrint: false,
  pdfFormat: null,
  method: null,
  error: null,
};

export let PdfActions: ActionsFromSlice<typeof pdfSlice>;
export const pdfSlice = () => {
  const slice = createSagaSlice((mkAction: MkActionType<IPdfState>) => ({
    name: 'pdf',
    initialState,
    extraSagas: [watchPdfReadySaga, watchPdfPreviewSaga],
    actions: {
      initial: mkAction<void>({
        saga: () => watchInitialPdfSaga,
      }),
      generateFulfilled: mkAction<void>({}),
      pdfReady: mkAction<void>({
        reducer: (state) => {
          state.readyForPrint = true;
        },
      }),
      generateRejected: mkAction<IPdfActionRejected>({
        reducer: (state, action) => {
          const { error } = action.payload;
          state.error = error;
        },
      }),
      methodFulfilled: mkAction<IPdfMethodFulfilled>({
        reducer: (state, action) => {
          const { method } = action.payload;
          state.method = method;
        },
      }),
      pdfFormatFulfilled: mkAction<IPdfFormatFulfilled>({
        reducer: (state, action) => {
          const { pdfFormat } = action.payload;
          state.pdfFormat = pdfFormat;
        },
      }),
      pdfStateChanged: mkAction<void>({}),
    },
  }));

  PdfActions = slice.actions;
  return slice;
};

export const PDF_LAYOUT_NAME = '__pdf__';
