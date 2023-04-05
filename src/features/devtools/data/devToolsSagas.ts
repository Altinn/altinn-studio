import { call, put, take } from 'redux-saga/effects';
import type { SagaIterator } from 'redux-saga';

import { DevToolsActions } from 'src/features/devtools/data/devToolsSlice';
import { PdfActions } from 'src/features/pdf/data/pdfSlice';
import { waitForSelector } from 'src/utils/pdf';

export function* previewPdfSaga(): SagaIterator {
  yield put(DevToolsActions.setPdfPreview({ preview: true }));
  yield take(PdfActions.generateFulfilled);
  const el = yield call(waitForSelector, '#pdfView #readyForPrint', 5000);
  if (el) {
    window.print();
  }
  yield put(DevToolsActions.setPdfPreview({ preview: false }));
}
