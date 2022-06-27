import { SagaIterator } from 'redux-saga';
import { call, select, take, all, takeLatest } from 'redux-saga/effects';
import { IData, IInstance } from 'altinn-shared/types';
import { IAttachments } from '..';
import { IRuntimeState } from 'src/types';
import { mapAttachmentListToAttachments } from 'src/utils/attachment';
import AttachmentDispatcher from '../attachmentActions';
import * as AttachmentActionsTypes from '../attachmentActionTypes';
import { IApplicationMetadata } from '../../applicationMetadata';
import { getCurrentTaskData } from 'src/utils/appMetadata';
import { IFormData } from "src/features/form/data/formDataReducer";
import FormDataActions from "src/features/form/data/formDataActions";
import type { ILayouts } from "src/features/form/layout";
import { FormLayoutActions } from "src/features/form/layout/formLayoutSlice";
import { GET_INSTANCEDATA_FULFILLED } from "src/shared/resources/instanceData/get/getInstanceDataActionTypes";
import { FETCH_APPLICATION_METADATA_FULFILLED } from "src/shared/resources/applicationMetadata/actions/types";

export function* watchMapAttachmentsSaga(): SagaIterator {
  yield all([
    take(FormDataActions.fetchFormDataFulfilled),
    take(FormLayoutActions.fetchLayoutFulfilled),
    take(FormLayoutActions.updateCurrentViewFulfilled),
    take(GET_INSTANCEDATA_FULFILLED),
    take(FETCH_APPLICATION_METADATA_FULFILLED),
  ]);
  yield call(mapAttachments);

  yield takeLatest(AttachmentActionsTypes.MAP_ATTACHMENTS, mapAttachments);
}

export const SelectInstanceData = (state: IRuntimeState): IData[] => state.instanceData.instance.data;
export const SelectInstance = (state: IRuntimeState): IInstance => state.instanceData.instance;
export const SelectApplicationMetaData =
  (state: IRuntimeState): IApplicationMetadata => state.applicationMetadata.applicationMetadata;
export const SelectFormData = (state:IRuntimeState) : IFormData => state.formData.formData;
export const SelectFormLayouts = (state:IRuntimeState) : ILayouts => state.formLayout.layouts;

export function* mapAttachments(): SagaIterator {
  try {
    const instance = yield select(SelectInstance);
    const applicationMetadata = yield select(SelectApplicationMetaData);
    const defaultElement = getCurrentTaskData(applicationMetadata, instance);

    const formData = yield select(SelectFormData);
    const layouts = yield select(SelectFormLayouts);

    const instanceAttachments: IData[] = yield select(SelectInstanceData);
    const mappedAttachments: IAttachments = mapAttachmentListToAttachments(
      instanceAttachments, defaultElement.id, formData, layouts
    );

    yield call(AttachmentDispatcher.mapAttachmentsFulfilled, mappedAttachments);
  } catch (err) {
    yield call(AttachmentDispatcher.mapAttachmentsRejected, err);
  }
}
