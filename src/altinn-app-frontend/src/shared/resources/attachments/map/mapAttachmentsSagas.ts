import type { SagaIterator } from 'redux-saga';
import { call, put, select, take, all, takeLatest } from 'redux-saga/effects';
import type { IData, IInstance } from 'altinn-shared/types';
import type { IAttachments } from '..';
import type { IRuntimeState } from 'src/types';
import { mapAttachmentListToAttachments } from 'src/utils/attachment';
import { AttachmentActions } from 'src/shared/resources/attachments/attachmentSlice';
import type { IApplicationMetadata } from '../../applicationMetadata';
import { getCurrentTaskData } from 'src/utils/appMetadata';
import type { IFormData } from 'src/features/form/data';
import { FormDataActions } from 'src/features/form/data/formDataSlice';
import type { ILayouts } from 'src/features/form/layout';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { ApplicationMetadataActions } from 'src/shared/resources/applicationMetadata/applicationMetadataSlice';
import { InstanceDataActions } from 'src/shared/resources/instanceData/instanceDataSlice';

export function* watchMapAttachmentsSaga(): SagaIterator {
  yield all([
    take(FormDataActions.fetchFulfilled),
    take(FormLayoutActions.fetchFulfilled),
    take(FormLayoutActions.updateCurrentViewFulfilled),
    take(InstanceDataActions.getFulfilled),
    take(ApplicationMetadataActions.getFulfilled),
  ]);
  yield call(mapAttachments);
  yield takeLatest(AttachmentActions.mapAttachments, mapAttachments);
}

export const SelectInstanceData = (state: IRuntimeState): IData[] =>
  state.instanceData.instance.data;
export const SelectInstance = (state: IRuntimeState): IInstance =>
  state.instanceData.instance;
export const SelectApplicationMetaData = (
  state: IRuntimeState,
): IApplicationMetadata => state.applicationMetadata.applicationMetadata;
export const SelectFormData = (state: IRuntimeState): IFormData =>
  state.formData.formData;
export const SelectFormLayouts = (state: IRuntimeState): ILayouts =>
  state.formLayout.layouts;

export function* mapAttachments(): SagaIterator {
  try {
    const instance = yield select(SelectInstance);
    const applicationMetadata = yield select(SelectApplicationMetaData);
    const defaultElement = getCurrentTaskData(applicationMetadata, instance);

    const formData = yield select(SelectFormData);
    const layouts = yield select(SelectFormLayouts);

    const instanceAttachments: IData[] = yield select(SelectInstanceData);
    const mappedAttachments: IAttachments = mapAttachmentListToAttachments(
      instanceAttachments,
      defaultElement.id,
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
  }
}
