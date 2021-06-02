/* eslint-disable no-undef */
/* eslint-disable max-len */
/* eslint-disable no-param-reassign */
/* eslint-disable no-restricted-syntax */
/* eslint-disable consistent-return */
import { SagaIterator } from 'redux-saga';
import { all, call, delay, put, select, take, takeEvery, takeLatest } from 'redux-saga/effects';
import * as SharedNetwork from 'app-shared/utils/networking';
import postMessages from 'app-shared/utils/postMessages';
import { ILayoutSettings } from 'app-shared/types';
import Axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { PayloadAction } from '@reduxjs/toolkit';
import { IFormDesignerState } from '../formDesignerReducer';
import { convertFromLayoutToInternalFormat, convertInternalToLayoutFormat } from '../../../utils/formLayout';
import { deleteCall, get, post } from '../../../utils/networking';
import { getAddApplicationMetadataUrl,
  getDeleteApplicationMetadataUrl,
  getDeleteForLayoutUrl,
  getSaveFormLayoutUrl,
  getLayoutSettingsUrl,
  getUpdateApplicationMetadataUrl,
  getSaveLayoutSettingsUrl,
  getUpdateFormLayoutNameUrl,
  getLayoutSchemaUrl,
  getFetchFormLayoutUrl } from '../../../utils/urlHelper';
import { ComponentTypes } from '../../../components';
import { IAddActiveFormContainerAction,
  IAddApplicationMetadataAction,
  IAddFormComponentAction,
  IAddFormContainerAction,
  IAddLayoutAction,
  IDeleteApplicationMetadataAction,
  IDeleteComponentsAction,
  IDeleteContainerAction,
  IDeleteLayoutAction,
  IUpdateApplicationMetadaAction,
  IUpdateFormComponentAction,
  IUpdateLayoutNameAction } from '../formDesignerTypes';
import { FormLayoutActions } from './formLayoutSlice';

const selectFormDesigner = (state: IAppState): IFormDesignerState => state.formDesigner;
const selectCurrentLayout = (state: IAppState): IFormLayout => state.formDesigner.layout.layouts[state.formDesigner.layout.selectedLayout];

function* addActiveFormContainerSaga({ payload }: PayloadAction<IAddActiveFormContainerAction>): SagaIterator {
  try {
    const { containerId } = payload;
    const formDesignerState: IFormDesignerState = yield select(selectFormDesigner);
    yield put(FormLayoutActions.addActiveFormContainerFulfilled({
      containerId: containerId === formDesignerState.layout.activeContainer ? '' : containerId,
    }));
  } catch (error) {
    yield put(FormLayoutActions.addFormComponentRejected({ error }));
  }
}

export function* watchAddActiveFormContainerSaga(): SagaIterator {
  yield takeLatest(FormLayoutActions.addActiveFormContainer, addActiveFormContainerSaga);
}

function* addFormComponentSaga({ payload }: PayloadAction<IAddFormComponentAction>): SagaIterator {
  try {
    let { position, containerId } = payload;
    const { component, callback } = payload;
    const id: string = uuidv4();
    const currentLayout: IFormLayout = yield select(selectCurrentLayout);

    if (!containerId) {
      // if not containerId set it to base-container
      containerId = Object.keys(currentLayout.order)[0];
    }
    if (!position) {
      // if position is undefined, put it on top
      position = 0;
    }
    yield put(FormLayoutActions.addFormComponentFulfilled({
      component,
      id,
      position,
      containerId,
      callback,
    }));
    yield put(FormLayoutActions.saveFormLayout());

    if (component.type === 'FileUpload') {
      const {
        maxNumberOfAttachments,
        minNumberOfAttachments,
        maxFileSizeInMB,
        validFileEndings,
      } = component as IFormFileUploaderComponent;
      yield put(FormLayoutActions.addApplicationMetadata({
        id,
        maxFiles: maxNumberOfAttachments,
        minFiles: minNumberOfAttachments,
        fileType: validFileEndings,
        maxSize: maxFileSizeInMB,
      }));
    }

    return id; // returns created id
  } catch (error) {
    yield put(FormLayoutActions.addApplicationMetadataRejected({ error }));
    console.error(error);
  }
}

export function* watchAddFormComponentSaga(): SagaIterator {
  yield takeLatest(FormLayoutActions.addFormComponent, addFormComponentSaga);
}

function* addFormContainerSaga({ payload }: PayloadAction<IAddFormContainerAction>): SagaIterator {
  try {
    const {
      container,
      positionAfterId,
      addToId,
      callback,
      destinationIndex,
    } = payload;
    const id = uuidv4();
    const currentLayout: IFormLayout = yield select(selectCurrentLayout);
    let baseContainerId;
    if (Object.keys(currentLayout.order)
      && Object.keys(currentLayout.order).length > 0) {
      baseContainerId = Object.keys(currentLayout.order)[0];
    }

    yield put(FormLayoutActions.addFormContainerFulfilled({
      container,
      id,
      positionAfterId,
      addToId,
      baseContainerId,
      destinationIndex,
      callback,
    }));
    yield put(FormLayoutActions.saveFormLayout());
  } catch (error) {
    yield put(FormLayoutActions.addFormContainerRejected({ error }));
  }
}

export function* watchAddFormContainerSaga(): SagaIterator {
  yield takeLatest(FormLayoutActions.addFormContainer, addFormContainerSaga);
}

function* deleteFormComponentsSaga({ payload }: PayloadAction<IDeleteComponentsAction>): SagaIterator {
  try {
    const { components } = payload;
    const currentLayout: IFormLayout = yield select(selectCurrentLayout);
    for (const id of components) {
      const component = currentLayout.components[id];
      if (component?.type === 'FileUpload') {
        yield put(FormLayoutActions.deleteApplicationMetadata({ id }));
      }
    }
    yield put(FormLayoutActions.saveFormLayout());
  } catch (error) {
    console.error(error);
    yield put(FormLayoutActions.deleteFormComponentRejected({ error }));
  }
}

export function* watchDeleteFormComponentSaga(): SagaIterator {
  yield takeEvery(FormLayoutActions.deleteFormComponents, deleteFormComponentsSaga);
}

function* deleteFormContainerSaga({ payload }: PayloadAction<IDeleteContainerAction>): SagaIterator {
  try {
    const {
      id,
      index,
    } = payload;
    const currentLayout: IFormLayout = yield select(selectCurrentLayout);
    let parentContainer = Object.keys(currentLayout.order)[0];
    Object.keys(currentLayout.order).forEach((cId) => {
      if (currentLayout.order[cId].find((containerId) => containerId === id)) {
        parentContainer = cId;
      }
    });
    for (const componentId of currentLayout.order[id]) {
      if (Object.keys(currentLayout.components).indexOf(componentId) > -1) {
        yield put(FormLayoutActions.deleteFormContainerFulfilled({
          id: componentId,
          parentContainerId: id,
        }));
      } else {
        yield put(FormLayoutActions.deleteFormContainerFulfilled({
          id: componentId,
          index: currentLayout.order[id].indexOf(componentId),
          parentContainerId: id,
        }));
      }
    }
    yield put(FormLayoutActions.deleteFormContainerFulfilled({
      id,
      index,
      parentContainerId: parentContainer,
    }));
    yield put(FormLayoutActions.saveFormLayout());
  } catch (error) {
    yield put(FormLayoutActions.deleteFormContainerRejected({ error }));
  }
}

export function* watchDeleteFormContainerSaga(): SagaIterator {
  yield takeLatest(FormLayoutActions.deleteFormContainer, deleteFormContainerSaga);
}

function* fetchFormLayoutSaga(): SagaIterator {
  try {
    const formLayouts: any = yield call(get, getFetchFormLayoutUrl());
    const convertedLayouts: IFormLayouts = {};
    if (!formLayouts || Object.keys(formLayouts).length === 0) {
      // Default name if no formlayout exists
      convertedLayouts.FormLayout = convertFromLayoutToInternalFormat(null);
    } else {
      Object.keys(formLayouts).forEach((layoutName: string) => {
        if (!formLayouts[layoutName] || !formLayouts[layoutName].data) {
          convertedLayouts[layoutName] = convertFromLayoutToInternalFormat(null);
        } else {
          convertedLayouts[layoutName] = convertFromLayoutToInternalFormat(formLayouts[layoutName].data.layout);
        }
      });
    }
    yield put(FormLayoutActions.fetchFormLayoutFulfilled({ formLayout: convertedLayouts }));
    yield put(FormLayoutActions.updateSelectedLayout({ selectedLayout: Object.keys(convertedLayouts)[0] }));
    yield put(FormLayoutActions.deleteActiveListFulfilled());
  } catch (error) {
    console.error(error);
    yield put(FormLayoutActions.fetchFormLayoutRejected({ error }));
  }
}

export function* watchFetchFormLayoutSaga(): SagaIterator {
  yield takeLatest(FormLayoutActions.fetchFormLayout, fetchFormLayoutSaga);
}

function* saveFormLayoutSaga(): SagaIterator {
  try {
    yield delay(200);
    const layouts = yield select((state: IAppState) => state.formDesigner.layout.layouts);
    const selectedLayout = yield select((state: IAppState) => state.formDesigner.layout.selectedLayout);
    const convertedLayout = {
      $schema: getLayoutSchemaUrl(),
      data: {
        layout: convertInternalToLayoutFormat(layouts[selectedLayout]),
      },
    };
    const url = getSaveFormLayoutUrl(selectedLayout);
    yield call(post, url, convertedLayout);
    yield put(FormLayoutActions.saveFormLayoutFulfilled());
    window.postMessage(postMessages.filesAreSaved, window.location.href);
  } catch (error) {
    console.error(error);
    yield put(FormLayoutActions.saveFormLayoutRejected({ error }));
  }
}

export function* watchSaveFormLayoutSaga(): SagaIterator {
  yield takeLatest([
    FormLayoutActions.saveFormLayout,
    FormLayoutActions.addLayoutFulfilled,
    FormLayoutActions.updateFormComponent,
    FormLayoutActions.updateFormContainer,
    FormLayoutActions.updateFormComponentOrder,
    FormLayoutActions.updateContainerId,
  ],
  saveFormLayoutSaga);
}

function* updateFormComponentSaga({ payload }: PayloadAction<IUpdateFormComponentAction>): SagaIterator {
  const {
    updatedComponent,
    id,
  } = payload;

  if (updatedComponent.type === 'FileUpload') {
    const {
      maxNumberOfAttachments,
      minNumberOfAttachments,
      maxFileSizeInMB,
      validFileEndings,
    } = updatedComponent as IFormFileUploaderComponent;

    if (id !== updatedComponent.id) {
      yield call(addApplicationMetadata, {
        payload: {
          id: updatedComponent.id,
          fileType: validFileEndings,
          maxFiles: maxNumberOfAttachments,
          maxSize: maxFileSizeInMB,
          minFiles: minNumberOfAttachments,
        },
        type: 'addApplicationMetadata',
      });
      yield call(deleteApplicationMetadata, { payload: { id }, type: 'deleteApplicationMetadata' });
    } else {
      yield put(FormLayoutActions.updateApplicationMetadata({
        fileType: validFileEndings,
        id,
        maxFiles: maxNumberOfAttachments,
        maxSize: maxFileSizeInMB,
        minFiles: minNumberOfAttachments,
      }));
    }
  }
}

export function* watchUpdateFormComponentSaga(): SagaIterator {
  yield takeLatest(FormLayoutActions.updateFormComponent, updateFormComponentSaga);
}

export function* addApplicationMetadata({ payload }: PayloadAction<IAddApplicationMetadataAction>): SagaIterator {
  try {
    const {
      id,
      maxFiles,
      minFiles,
      maxSize,
      fileType,
    } = payload;
    const addApplicationMetadataUrl: string = yield call(getAddApplicationMetadataUrl);
    yield call(SharedNetwork.post, addApplicationMetadataUrl,
      {
        id,
        maxCount: maxFiles,
        minCount: minFiles,
        maxSize,
        fileType,
      });
    yield put(FormLayoutActions.addApplicationMetadataFulfilled());
  } catch (error) {
    yield put(FormLayoutActions.addApplicationMetadataRejected({ error }));
  }
}

export function* watchAddApplicationMetadataSaga(): SagaIterator {
  yield takeLatest(FormLayoutActions.addApplicationMetadata, addApplicationMetadata);
}

export function* deleteApplicationMetadata({ payload }: PayloadAction<IDeleteApplicationMetadataAction>): SagaIterator {
  try {
    const { id } = payload;
    const deleteApplicationMetadataUrl: string = yield call(getDeleteApplicationMetadataUrl);
    yield call(SharedNetwork.post, deleteApplicationMetadataUrl + id,
      {
        id,
      });
    yield put(FormLayoutActions.deleteApplicationMetadataFulfilled());
  } catch (error) {
    yield put(FormLayoutActions.deleteApplicationMetadataRejected({ error }));
  }
}

export function* watchDeleteApplicationMetadataSaga(): SagaIterator {
  yield takeLatest(FormLayoutActions.deleteApplicationMetadata, deleteApplicationMetadata);
}

export function* updateApplicationMetadata({ payload }: PayloadAction<IUpdateApplicationMetadaAction>): SagaIterator {
  try {
    const {
      id,
      maxFiles,
      minFiles,
      maxSize,
      fileType,
    } = payload;
    const updateApplicationMetadataUrl: string = yield call(getUpdateApplicationMetadataUrl);
    yield call(SharedNetwork.post, updateApplicationMetadataUrl,
      {
        id,
        maxCount: maxFiles,
        minCount: minFiles,
        maxSize,
        fileType,
      });
    yield put(FormLayoutActions.updateApplicationMetadataFulfilled());
  } catch (error) {
    yield put(FormLayoutActions.updateApplicationMetadataRejected({ error }));
  }
}

export function* watchUpdateApplicationMetadataSaga(): SagaIterator {
  yield takeLatest(FormLayoutActions.updateApplicationMetadata, updateApplicationMetadata);
}

export function* addLayoutSaga({ payload }: PayloadAction<IAddLayoutAction>): SagaIterator {
  try {
    const { layout } = payload;
    const layouts: IFormLayouts = yield select((state: IAppState) => state.formDesigner.layout.layouts);
    const layoutOrder: string[] = yield select((state: IAppState) => state.formDesigner.layout.layoutSettings.pages.order);
    const layoutsCopy = JSON.parse(JSON.stringify(layouts));
    if (Object.keys(layoutsCopy).indexOf(layout) !== -1) {
      throw Error('Layout allready exists');
    }
    layoutsCopy[layout] = convertFromLayoutToInternalFormat(null);

    yield put(FormLayoutActions.addLayoutFulfilled({ layouts: layoutsCopy, layoutOrder: [...layoutOrder, layout] }));

    if (Object.keys(layoutsCopy).length > 1) {
      const NavigationButtonComponent = {
        type: 'NavigationButtons',
        componentType: ComponentTypes.NavigationButtons,
        textResourceBindings: {
          next: 'next',
          back: 'back',
        },
        dataModelBindings: {},
        showBackButton: true,
      };

      yield put(FormLayoutActions.addFormComponent({
        component: { ...NavigationButtonComponent, id: uuidv4() },
        position: 0,
        containerId: Object.keys(layoutsCopy[layout].containers)[0],
      }));
      const firstPageKey = layoutOrder[0];
      const firstPage = layouts[firstPageKey];
      yield put(FormLayoutActions.updateSelectedLayout({ selectedLayout: firstPageKey }));
      const hasNaviagtionButton = Object.keys(firstPage.components).some((component: string) => firstPage.components[component].type === 'NavigationButtons');
      if (!hasNaviagtionButton) {
        yield put(FormLayoutActions.addFormComponent({
          component: { ...NavigationButtonComponent, id: uuidv4() },
          position: Object.keys(layoutsCopy[firstPageKey].components).length,
          containerId: Object.keys(layoutsCopy[firstPageKey].containers)[0],
        }));
      }

      yield put(FormLayoutActions.updateSelectedLayout({ selectedLayout: layout }));
    }
  } catch (error) {
    console.error(error);
    yield put(FormLayoutActions.addLayoutRejected({ error }));
  }
}

export function* watchAddLayoutSaga(): SagaIterator {
  yield takeLatest(FormLayoutActions.addLayout, addLayoutSaga);
}

export function* updateLayoutNameSaga({ payload }: PayloadAction<IUpdateLayoutNameAction>): SagaIterator {
  try {
    const { oldName, newName } = payload;
    yield call(Axios.post, getUpdateFormLayoutNameUrl(oldName), JSON.stringify(newName), { headers: { 'Content-Type': 'application/json' } });
    yield put(FormLayoutActions.updateSelectedLayout({ selectedLayout: newName }));
    yield put(FormLayoutActions.updateLayoutNameFulfilled({ newName, oldName }));
  } catch (error) {
    yield put(FormLayoutActions.updateLayoutNameRejected({ error }));
  }
}

export function* watchUpdateLayoutNameSaga(): SagaIterator {
  yield takeLatest(FormLayoutActions.updateLayoutName, updateLayoutNameSaga);
}

export function* fetchFormLayoutSettingSaga(): SagaIterator {
  try {
    const settings: ILayoutSettings = yield call(get, getLayoutSettingsUrl());
    if (settings) {
      yield put(FormLayoutActions.fetchLayoutSettingsFulfilled({ settings }));
    }
  } catch (error) {
    yield put(FormLayoutActions.fetchLayoutSettingsRejected({ error }));
  }
}

export function* watchFetchFormLayoutSettingSaga(): SagaIterator {
  while (true) {
    yield all([
      take(FormLayoutActions.fetchFormLayoutFulfilled),
      take(FormLayoutActions.fetchLayoutSettings),
    ]);
    yield call(fetchFormLayoutSettingSaga);
  }
}

export function* saveFormLayoutSettingSaga(): SagaIterator {
  try {
    const layoutSettings = yield select((state: IAppState) => state.formDesigner.layout.layoutSettings);
    yield call(post, getSaveLayoutSettingsUrl(), layoutSettings);
  } catch (err) {
    console.error(err);
  }
}

export function* watchSaveFormLayoutSettingSaga(): SagaIterator {
  yield takeLatest([
    FormLayoutActions.updateLayoutNameFulfilled,
    FormLayoutActions.updateLayoutOrder,
    FormLayoutActions.deleteLayoutFulfilled,
    FormLayoutActions.addLayoutFulfilled,
  ], saveFormLayoutSettingSaga);
}

export function* deleteLayoutSaga({ payload }: PayloadAction<IDeleteLayoutAction>): SagaIterator {
  try {
    const { layout } = payload;
    yield put(FormLayoutActions.deleteLayoutFulfilled({ layout }));
    const deleteLayoutUrl: string = yield call(getDeleteForLayoutUrl, layout);
    yield call(deleteCall, deleteLayoutUrl);
  } catch (error) {
    yield put(FormLayoutActions.deleteLayoutRejected({ error }));
  }
}

export function* watchDeleteLayoutSaga(): SagaIterator {
  yield takeLatest(FormLayoutActions.deleteLayout, deleteLayoutSaga);
}

export function* deleteActiveListSaga(): SagaIterator {
  try {
    yield put(FormLayoutActions.deleteActiveListFulfilled());
  } catch (error) {
    yield put(FormLayoutActions.deleteActiveListRejected({ error }));
  }
}

export function* watchDeleteActiveListSaga(): SagaIterator {
  yield takeLatest(
    [
      FormLayoutActions.deleteActiveList,
      FormLayoutActions.updateSelectedLayout,
    ],
    deleteActiveListSaga,
  );
}
