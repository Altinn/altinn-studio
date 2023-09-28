import { all, call, put, select, take, takeEvery } from 'redux-saga/effects';
import type { SagaIterator } from 'redux-saga';

import { ApplicationMetadataActions } from 'src/features/applicationMetadata/applicationMetadataSlice';
import { AttachmentActions } from 'src/features/attachments/attachmentSlice';
import { FormDataActions } from 'src/features/formData/formDataSlice';
import { InstanceDataActions } from 'src/features/instanceData/instanceDataSlice';
import { FormLayoutActions } from 'src/features/layout/formLayoutSlice';
import { getCurrentTaskData } from 'src/utils/appMetadata';
import { mapAttachmentListToAttachments } from 'src/utils/attachment';
import type { IApplicationMetadata } from 'src/features/applicationMetadata';
import type { IAttachments } from 'src/features/attachments';
import type { IFormData } from 'src/features/formData';
import type { ILayouts } from 'src/layout/layout';
import type { ILayoutSets, IRuntimeState } from 'src/types';
import type { IData, IInstance } from 'src/types/shared';

export function* watchMapAttachmentsSaga(): SagaIterator {
  yield all([
    take(FormDataActions.fetchFulfilled),
    take(FormLayoutActions.fetchFulfilled),
    take(FormLayoutActions.updateCurrentViewFulfilled),
    take(InstanceDataActions.getFulfilled),
    take(ApplicationMetadataActions.getFulfilled),
  ]);
  yield call(mapAttachments);
  yield takeEvery(AttachmentActions.mapAttachments, mapAttachments);
}

export const SelectInstanceData = (state: IRuntimeState): IData[] | undefined => state.instanceData.instance?.data;
export const SelectInstance = (state: IRuntimeState): IInstance | null => state.instanceData.instance;
export const SelectApplicationMetaData = (state: IRuntimeState): IApplicationMetadata | null =>
  state.applicationMetadata.applicationMetadata;
export const SelectFormData = (state: IRuntimeState): IFormData => state.formData.formData;
export const SelectFormLayouts = (state: IRuntimeState): ILayouts | null => state.formLayout.layouts;
export const SelectFormLayoutSets = (state: IRuntimeState): ILayoutSets | null => state.formLayout.layoutsets;

export function* mapAttachments(): SagaIterator {
  try {
    const instance = yield select(SelectInstance);
    const applicationMetadata = yield select(SelectApplicationMetaData);
    const layoutSets: ILayoutSets = yield select(SelectFormLayoutSets);
    const defaultElement = getCurrentTaskData(applicationMetadata, instance, layoutSets);

    const formData = yield select(SelectFormData);
    const layouts = yield select(SelectFormLayouts);

    const instanceAttachments: IData[] = yield select(SelectInstanceData);
    const mappedAttachments: IAttachments = mapAttachmentListToAttachments(
      instanceAttachments,
      defaultElement?.id,
      formData,
      layouts,
    );

    yield put(
      AttachmentActions.mapAttachmentsFulfilled({
        attachments: mappedAttachments,
      }),
    );
  } catch (error) {
    yield put(AttachmentActions.mapAttachmentsRejected({ error }));
    window.logError('Mapping attachments failed:\n', error);
  }
}
