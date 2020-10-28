/* eslint-disable no-param-reassign */
/* eslint-disable no-restricted-syntax */
/* eslint-disable consistent-return */
import { SagaIterator } from 'redux-saga';
import { call, select, takeLatest } from 'redux-saga/effects';
import * as SharedNetwork from 'app-shared/utils/networking';
import postMessages from 'app-shared/utils/postMessages';
import * as FormDesignerActions from '../../actions/formDesignerActions/actions';
import FormDesignerActionDispatchers from '../../actions/formDesignerActions/formDesignerActionDispatcher';
import * as FormDesignerActionTypes from '../../actions/formDesignerActions/formDesignerActionTypes';
import { IFormDesignerState } from '../../reducers/formDesignerReducer';
import { convertFromLayoutToInternalFormat, convertInternalToLayoutFormat } from '../../utils/formLayout';
import { get, post } from '../../utils/networking';
import { getAddApplicationMetadataUrl, getDeleteApplicationMetadataUrl, getSaveFormLayoutUrl, getUpdateApplicationMetadataUrl } from '../../utils/urlHelper';
import { IUpdateContainerIdAction } from '../../actions/formDesignerActions/actions';
// tslint:disable-next-line:no-var-requires
const uuid = require('uuid/v4');

const selectFormDesigner = (state: IAppState): IFormDesignerState => state.formDesigner;

function* addActiveFormContainerSaga({ containerId }: FormDesignerActions.IAddActiveFormContainerAction): SagaIterator {
  try {
    const formDesignerState: IFormDesignerState = yield select(selectFormDesigner);
    yield call(
      FormDesignerActionDispatchers.addActiveFormContainerFulfilled,
      containerId === formDesignerState.layout.activeContainer ? '' : containerId,
    );
  } catch (err) {
    yield call(FormDesignerActionDispatchers.addFormComponentRejected, err);
  }
}

export function* watchAddActiveFormContainerSaga(): SagaIterator {
  yield takeLatest(
    FormDesignerActionTypes.ADD_ACTIVE_FORM_CONTAINER,
    addActiveFormContainerSaga,
  );
}

function* addFormComponentSaga({
  component,
  position,
  containerId,
  callback,
}: FormDesignerActions.IAddFormComponentAction): SagaIterator {
  try {
    const id: string = uuid();

    const formDesignerState: IFormDesignerState = yield select(selectFormDesigner);

    if (!containerId) {
      // if not containerId set it to base-container
      containerId = Object.keys(formDesignerState.layout.order)[0];
    }
    if (!position) {
      // if position is undefined, put it on top
      position = 0;
    }
    yield call(
      FormDesignerActionDispatchers.addFormComponentFulfilled,
      component,
      id,
      position,
      containerId,
      callback,
    );
    const saveFormLayoutUrl: string = yield call(getSaveFormLayoutUrl);
    yield call(
      FormDesignerActionDispatchers.saveFormLayout,
      saveFormLayoutUrl,
    );
    if (component.type === 'FileUpload') {
      const {
        maxNumberOfAttachments,
        minNumberOfAttachments,
        maxFileSizeInMB,
        validFileEndings,
      } = component as IFormFileUploaderComponent;
      yield call(FormDesignerActionDispatchers.addApplicationMetadata,
        id, maxNumberOfAttachments, minNumberOfAttachments, maxFileSizeInMB, validFileEndings);
    }
    return id; // returns created id
  } catch (err) {
    yield call(FormDesignerActionDispatchers.addFormComponentRejected, err);
    console.error(err);
  }
}

export function* watchAddFormComponentSaga(): SagaIterator {
  yield takeLatest(
    FormDesignerActionTypes.ADD_FORM_COMPONENT,
    addFormComponentSaga,
  );
}

function* addFormContainerSaga({
  container,
  positionAfterId,
  addToId,
  callback,
  destinationIndex,
}: FormDesignerActions.IAddFormContainerAction): SagaIterator {
  try {
    const id = uuid();
    const formDesignerState: IFormDesignerState = yield select(selectFormDesigner);
    let baseContainerId;
    if (Object.keys(formDesignerState.layout.order)
      && Object.keys(formDesignerState.layout.order).length > 0) {
      baseContainerId = Object.keys(formDesignerState.layout.order)[0];
    }

    yield call(
      FormDesignerActionDispatchers.addFormContainerFulfilled,
      container,
      id,
      positionAfterId,
      addToId,
      baseContainerId,
      callback,
      destinationIndex,
    );
    const saveFormLayoutUrl: string = yield call(getSaveFormLayoutUrl);
    yield call(
      FormDesignerActionDispatchers.saveFormLayout,
      saveFormLayoutUrl,
    );
  } catch (err) {
    yield call(FormDesignerActionDispatchers.addFormContainerRejected, err);
  }
}

export function* watchAddFormContainerSaga(): SagaIterator {
  yield takeLatest(
    FormDesignerActionTypes.ADD_FORM_CONTAINER,
    addFormContainerSaga,
  );
}

function* deleteFormComponentSaga({
  id,
}: FormDesignerActions.IDeleteComponentAction): SagaIterator {
  try {
    const formDesignerState: IFormDesignerState = yield select(selectFormDesigner);
    let containerId = Object.keys(formDesignerState.layout.order)[0];
    Object.keys(formDesignerState.layout.order).forEach((cId) => {
      if (formDesignerState.layout.order[cId].find((componentId) => componentId === id)) {
        containerId = cId;
      }
    });
    yield call(FormDesignerActionDispatchers.deleteFormComponentFulfilled, id, containerId);
    const saveFormLayoutUrl: string = yield call(getSaveFormLayoutUrl);
    yield call(
      FormDesignerActionDispatchers.saveFormLayout,
      saveFormLayoutUrl,
    );
    const component = formDesignerState.layout.components[id];

    if (component.type === 'FileUpload') {
      yield call(FormDesignerActionDispatchers.deleteApplicationMetadata,
        id);
    }
  } catch (err) {
    yield call(FormDesignerActionDispatchers.deleteFormComponentRejected, err);
  }
}

export function* watchDeleteFormComponentSaga(): SagaIterator {
  yield takeLatest(
    FormDesignerActionTypes.DELETE_FORM_COMPONENT,
    deleteFormComponentSaga,
  );
}

function* deleteFormContainerSaga({
  id,
}: FormDesignerActions.IDeleteContainerAction): SagaIterator {
  try {
    const formDesignerState: IFormDesignerState = yield select(selectFormDesigner);
    for (const componentId of formDesignerState.layout.order[id]) {
      yield call(FormDesignerActionDispatchers.deleteFormComponentFulfilled, componentId, id);
    }
    yield call(FormDesignerActionDispatchers.deleteFormContainerFulfilled, id);
    const saveFormLayoutUrl: string = yield call(getSaveFormLayoutUrl);
    yield call(
      FormDesignerActionDispatchers.saveFormLayout,
      saveFormLayoutUrl,
    );
  } catch (err) {
    yield call(FormDesignerActionDispatchers.deleteFormContainerRejected, err);
  }
}

export function* watchDeleteFormContainerSaga(): SagaIterator {
  yield takeLatest(
    FormDesignerActionTypes.DELETE_FORM_CONTAINER,
    deleteFormContainerSaga,
  );
}

function* fetchFormLayoutSaga({
  url,
}: FormDesignerActions.IFetchFormLayoutAction): SagaIterator {
  try {
    const fetchedFormLayout: any = yield call(get, url);
    let convertedFormLayout: any;
    let hasOldFormat = false;
    if (!fetchedFormLayout || !fetchedFormLayout.data) {
      convertedFormLayout = yield call(convertFromLayoutToInternalFormat, null);
    } else if (!fetchedFormLayout.data.layout) {
      // TODO: remove this else at some later point
      // The service has the old internal format -> map from old to new, then back to fix component.component update
      // This else can be removed at some point
      hasOldFormat = true;
      const newLayout = yield call(convertInternalToLayoutFormat, fetchedFormLayout.data);
      convertedFormLayout = yield call(convertFromLayoutToInternalFormat, newLayout);
    } else {
      convertedFormLayout = yield call(convertFromLayoutToInternalFormat, fetchedFormLayout.data.layout);
    }
    yield call(
      FormDesignerActionDispatchers.fetchFormLayoutFulfilled,
      convertedFormLayout,
    );

    if (hasOldFormat) {
      yield call(FormDesignerActionDispatchers.saveFormLayout, getSaveFormLayoutUrl());
    }

    if (!convertedFormLayout || !Object.keys(convertedFormLayout.order).length) {
      yield call(FormDesignerActionDispatchers.addFormContainer,
        {
          itemType: 'CONTAINER',
        });
    }
    yield call(FormDesignerActionDispatchers.deleteActiveListActionFulfilled);
  } catch (err) {
    console.error(err);
    yield call(FormDesignerActionDispatchers.fetchFormLayoutRejected, err);
  }
}

export function* watchFetchFormLayoutSaga(): SagaIterator {
  yield takeLatest(
    FormDesignerActionTypes.FETCH_FORM_LAYOUT,
    fetchFormLayoutSaga,
  );
}

function* saveFormLayoutSaga({
  url,
}: FormDesignerActions.ISaveFormLayoutAction): SagaIterator {
  try {
    const formLayout: IAppState = yield select();
    const convertedFormLayout = yield call(convertInternalToLayoutFormat, {
      components: formLayout.formDesigner.layout.components,
      containers: formLayout.formDesigner.layout.containers,
      order: formLayout.formDesigner.layout.order,
    });
    yield call(post, url, {
      data: {
        layout: convertedFormLayout,
      },
    });
    yield call(FormDesignerActionDispatchers.saveFormLayoutFulfilled);
    window.postMessage(postMessages.filesAreSaved, window.location.href);
  } catch (err) {
    yield call(FormDesignerActionDispatchers.saveFormLayoutRejected, err);
  }
}

export function* watchSaveFormLayoutSaga(): SagaIterator {
  yield takeLatest(
    FormDesignerActionTypes.SAVE_FORM_LAYOUT,
    saveFormLayoutSaga,
  );
}

function* updateDataModelBindingSaga({
  dataModelBinding,
  id,
}: FormDesignerActions.IUpdateDataModelBindingAction): SagaIterator {
  try {
    yield call(
      FormDesignerActionDispatchers.updateDataModelBindingFulfilled,
      dataModelBinding,
      id,
    );
  } catch (err) {
    yield call(
      FormDesignerActionDispatchers.updateDataModelBindingRejected,
      err,
    );
  }
}

export function* watchUpdateDataModelBindingSaga(): SagaIterator {
  yield takeLatest(
    FormDesignerActionTypes.UPDATE_DATA_MODEL_BINDING,
    updateDataModelBindingSaga,
  );
}

function* updateFormComponentSaga({
  updatedComponent,
  id,
}: FormDesignerActions.IUpdateFormComponentAction): SagaIterator {
  try {
    yield call(
      FormDesignerActionDispatchers.updateFormComponentFulfilled,
      updatedComponent,
      id,
    );
    const saveFormLayoutUrl: string = yield call(getSaveFormLayoutUrl);
    yield call(
      FormDesignerActionDispatchers.saveFormLayout,
      saveFormLayoutUrl,
    );
    if (updatedComponent.type === 'FileUpload') {
      const {
        maxNumberOfAttachments,
        minNumberOfAttachments,
        maxFileSizeInMB,
        validFileEndings,
      } = updatedComponent as IFormFileUploaderComponent;
      yield call(FormDesignerActionDispatchers.updateApplicationMetadata,
        id, maxNumberOfAttachments, minNumberOfAttachments, maxFileSizeInMB, validFileEndings);
    }
  } catch (err) {
    yield call(FormDesignerActionDispatchers.updateFormComponentRejected, err);
  }
}

export function* watchUpdateFormComponentSaga(): SagaIterator {
  yield takeLatest(
    FormDesignerActionTypes.UPDATE_FORM_COMPONENT,
    updateFormComponentSaga,
  );
}

export function* updateFormContainerSaga({
  updatedContainer,
  id,
}: FormDesignerActions.IUpdateFormContainerAction): SagaIterator {
  try {
    yield call(
      FormDesignerActionDispatchers.updateFormContainerFulfilled,
      updatedContainer,
      id,
    );
    yield call(
      FormDesignerActionDispatchers.saveFormLayout,
      getSaveFormLayoutUrl(),
    );
  } catch (err) {
    yield call(FormDesignerActionDispatchers.updateFormContainerRejected, err);
  }
}

export function* watchUpdateContainerSaga(): SagaIterator {
  yield takeLatest(
    FormDesignerActionTypes.UPDATE_FORM_CONTAINER,
    updateFormContainerSaga,
  );
}

export function* updateFormComponentOrderSaga({
  updatedOrder,
}: FormDesignerActions.IUpdateFormComponentOrderAction): SagaIterator {
  try {
    yield call(FormDesignerActionDispatchers.updateFormComponentOrderActionFulfilled,
      updatedOrder);
    const saveFormLayoutUrl: string = yield call(getSaveFormLayoutUrl);
    yield call(
      FormDesignerActionDispatchers.saveFormLayout,
      saveFormLayoutUrl,
    );
  } catch (err) {
    yield call(FormDesignerActionDispatchers.updatedFormComponentOrderActionRejected,
      err);
  }
}

export function* watchUpdateFormComponentOrderSaga(): SagaIterator {
  yield takeLatest(
    FormDesignerActionTypes.UPDATE_FORM_COMPONENT_ORDER,
    updateFormComponentOrderSaga,
  );
}

export function* addApplicationMetadata({
  id,
  maxFiles,
  minFiles,
  maxSize,
  fileType,
}: FormDesignerActions.IAddApplicationMetadataAction): SagaIterator {
  try {
    const addApplicationMetadataUrl: string = yield call(getAddApplicationMetadataUrl);
    yield call(SharedNetwork.post, addApplicationMetadataUrl,
      {
        id,
        maxCount: maxFiles,
        minCount: minFiles,
        maxSize,
        fileType,
      });
    yield call(
      FormDesignerActionDispatchers.addApplicationMetadataFulfilled,
    );
  } catch (error) {
    yield call(FormDesignerActionDispatchers.addApplicationMetadataRejected,
      error);
  }
}

export function* watchAddApplicationMetadataSaga(): SagaIterator {
  yield takeLatest(FormDesignerActionTypes.ADD_APPLICATION_METADATA, addApplicationMetadata);
}

export function* deleteApplicationMetadata({
  id,
}: FormDesignerActions.IDeleteApplicationMetadataAction): SagaIterator {
  try {
    const deleteApplicationMetadataUrl: string = yield call(getDeleteApplicationMetadataUrl);
    yield call(SharedNetwork.post, deleteApplicationMetadataUrl + id,
      {
        id,
      });
    yield call(
      FormDesignerActionDispatchers.deleteApplicationMetadataFulfilled,
    );
  } catch (error) {
    yield call(FormDesignerActionDispatchers.deleteApplicationMetadataRejected,
      error);
  }
}

export function* watchDeleteApplicationMetadataSaga(): SagaIterator {
  yield takeLatest(FormDesignerActionTypes.DELETE_APPLICATION_METADATA, deleteApplicationMetadata);
}

export function* updateApplicationMetadata({
  id,
  maxFiles,
  minFiles,
  maxSize,
  fileType,
}: FormDesignerActions.IAddApplicationMetadataAction): SagaIterator {
  try {
    const updateApplicationMetadataUrl: string = yield call(getUpdateApplicationMetadataUrl);
    yield call(SharedNetwork.post, updateApplicationMetadataUrl,
      {
        id,
        maxCount: maxFiles,
        minCount: minFiles,
        maxSize,
        fileType,
      });
    yield call(
      FormDesignerActionDispatchers.updateApplicationMetadataFulfilled,
    );
  } catch (error) {
    yield call(FormDesignerActionDispatchers.updateApplicationMetadataRejected,
      error);
  }
}

export function* watchUpdateApplicationMetadataSaga(): SagaIterator {
  yield takeLatest(FormDesignerActionTypes.UPDATE_APPLICATION_METADATA, updateApplicationMetadata);
}

export function* updateContainerIdSaga({ currentId, newId }: IUpdateContainerIdAction): SagaIterator {
  try {
    yield call(FormDesignerActionDispatchers.updateContainerIdFulfilled, currentId, newId);
    yield call(FormDesignerActionDispatchers.saveFormLayout, getSaveFormLayoutUrl());
  } catch (error) {
    yield call(FormDesignerActionDispatchers.updateContainerIdRejected, error);
  }
}

export function* watchUpdateContainerIdSaga(): SagaIterator {
  yield takeLatest(FormDesignerActionTypes.UPDATE_CONTAINER_ID, updateContainerIdSaga);
}
