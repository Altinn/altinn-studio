import { put, select } from 'redux-saga/effects';
import type { SagaIterator } from 'redux-saga';

import { FormLayoutActions } from 'src/features/layout/formLayoutSlice';
import { selectAttachmentState, selectFormLayouts } from 'src/features/layout/update/updateFormLayoutSagas';
import { mapFileUploadersWithTag } from 'src/utils/formLayout';
import type { IAttachmentState } from 'src/features/attachments';
import type { IFileUploadersWithTag } from 'src/types';

export function* mapFileUploaderWithTagSaga(): SagaIterator {
  const attachmentState: IAttachmentState = yield select(selectAttachmentState);
  const layouts = yield select(selectFormLayouts);
  let newUploads: IFileUploadersWithTag = {};
  Object.keys(layouts).forEach((layoutKey: string) => {
    newUploads = {
      ...newUploads,
      ...mapFileUploadersWithTag(layouts[layoutKey], attachmentState),
    };
  });
  yield put(
    FormLayoutActions.updateFileUploadersWithTagFulfilled({
      uploaders: newUploads,
    }),
  );
}
