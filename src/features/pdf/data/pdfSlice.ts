import { watchInitialPdfSaga, watchPdfPreviewSaga, watchPdfReadySaga } from 'src/features/pdf/data/generatePdfSagas';
import { createSagaSlice } from 'src/shared/resources/utils/sagaSlice';
import type { IPdfActionRejected, IPdfFormatFulfilled, IPdfState } from 'src/features/pdf/data/types';
import type { IPdfMethodFulfilled } from 'src/features/pdf/data/types.d';
import type { MkActionType } from 'src/shared/resources/utils/sagaSlice';

export const initialState: IPdfState = {
  readyForPrint: false,
  pdfFormat: null,
  method: null,
  error: null,
};

export const pdfSlice = createSagaSlice((mkAction: MkActionType<IPdfState>) => ({
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

export const PdfActions = pdfSlice.actions;
export const PDF_LAYOUT_NAME = '__pdf__';
