import { SagaIterator } from 'redux-saga';
import { call, select, takeLatest } from 'redux-saga/effects';
import * as SharedNetwork from '../../../../shared/src/utils/networking';
import postMessages from '../../../../shared/src/utils/postMessages';
import conditionalRenderingActionDispatcher from '../../actions/conditionalRenderingActions/conditionalRenderingActionDispatcher';
import * as FormDesignerActions from '../../actions/formDesignerActions/actions';
import FormDesignerActionDispatchers from '../../actions/formDesignerActions/formDesignerActionDispatcher';
import * as FormDesignerActionTypes from '../../actions/formDesignerActions/formDesignerActionTypes';
import { IFormDesignerState } from '../../reducers/formDesignerReducer';
import { IFormFillerState } from '../../reducers/formFillerReducer';
import { IServiceConfigurationState } from '../../reducers/serviceConfigurationReducer';
import { getParentContainerId } from '../../utils/formLayout';
import { get, post } from '../../utils/networking';
import { getAddApplicationMetadataUrl, getDeleteApplicationMetadataUrl, getSaveFormLayoutUrl, getUpdateApplicationMetadataUrl } from '../../utils/urlHelper';
// tslint:disable-next-line:no-var-requires
const uuid = require('uuid/v4');
const selectFormDesigner = (state: IAppState): IFormDesignerState => state.formDesigner;
const selectFormFiller = (state: IAppState): IFormFillerState => state.formFiller;
const selectServiceConfiguration = (state: IAppState): IServiceConfiguration => state.serviceConfigurations;

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
    if (component.component === 'FileUpload') {
      const { maxNumberOfAttachments, maxFileSizeInMB, validFileEndings } = component as IFormFileUploaderComponent;
      yield call(FormDesignerActionDispatchers.addApplicationMetadata,
        id, maxNumberOfAttachments, maxFileSizeInMB, validFileEndings);
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
    Object.keys(formDesignerState.layout.order).forEach((cId, index) => {
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

    if (component.component === 'FileUpload') {
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
  index,
  parentContainerId,
}: FormDesignerActions.IDeleteContainerAction): SagaIterator {
  try {
    const formDesignerState: IFormDesignerState = yield select(selectFormDesigner);
    if (index === 0) {
      // Delete content of container
      for (const componentId of formDesignerState.layout.order[id]) {
        yield call(FormDesignerActionDispatchers.deleteFormComponentFulfilled, componentId, id);
      }
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
    const formLayout = yield call(get, url);
    if (!formLayout || !formLayout.data) {
      yield call(
        FormDesignerActionDispatchers.fetchFormLayoutFulfilled,
        null,
      );
    } else {
      yield call(
        FormDesignerActionDispatchers.fetchFormLayoutFulfilled,
        formLayout.data,
      );
    }

    if (!formLayout || !formLayout.data || !Object.keys(formLayout.data.order).length) {
      yield call(FormDesignerActionDispatchers.addFormContainer,
        {
          repeating: false,
          dataModelGroup: null,
          index: 0,
        },
      );
    }
  } catch (err) {
    yield call(FormDesignerActionDispatchers.fetchFormLayoutRejected, err);
  }
}

export function* watchFetchFormLayoutSaga(): SagaIterator {
  yield takeLatest(
    FormDesignerActionTypes.FETCH_FORM_LAYOUT,
    fetchFormLayoutSaga,
  );
}

function* generateRepeatingGroupsSaga({ }: FormDesignerActions.IGenerateRepeatingGroupsAction): SagaIterator {
  try {
    const formDesignerState: IFormDesignerState = yield select(selectFormDesigner);
    const formFillerState: IFormFillerState = yield select(selectFormFiller);
    const containers = formDesignerState.layout.containers;
    if (Object.keys(containers).length === 0) {
      return;
    }

    const baseContainerId = Object.keys(formDesignerState.layout.order)[0];
    for (const containerId of Object.keys(containers)) {
      const container = containers[containerId];
      if (!container.repeating) {
        continue;
      }

      const repeatingData = Object.keys(formFillerState.formData).filter((formDataKey) => {
        return formDataKey.includes(container.dataModelGroup + '[');
      });

      if (repeatingData.length === 0) {
        continue;
      }

      let maxIndex = 0;
      repeatingData.forEach((data) => {
        const index = parseInt(data.substring(data.indexOf('[') + 1, data.indexOf(']')), 10);
        if (index <= maxIndex) {
          return;
        }
        maxIndex = index;
      });

      let renderAfterId = containerId;
      for (let i = 1; i <= maxIndex; i++) {
        const newId = uuid();
        const newContainer: ICreateFormContainer = {
          repeating: container.repeating,
          dataModelGroup: container.dataModelGroup,
          index: i,
        };

        yield call(
          FormDesignerActionDispatchers.addFormContainerFulfilled,
          newContainer,
          newId,
          renderAfterId,
          baseContainerId,
        );
        renderAfterId = newId;
      }
    }
  } catch (err) {
    yield call(FormDesignerActionDispatchers.generateRepeatingGroupsActionRejected, err);
  }
}

export function* watchGenerateRepeatingGroupsSaga(): SagaIterator {
  yield takeLatest(
    FormDesignerActionTypes.GENERATE_REPEATING_GROUPS,
    generateRepeatingGroupsSaga,
  );
}

function* saveFormLayoutSaga({
  url,
}: FormDesignerActions.ISaveFormLayoutAction): SagaIterator {
  try {
    const formLayout: IAppState = yield select();
    yield call(post, url, {
      data: {
        components: formLayout.formDesigner.layout.components,
        containers: formLayout.formDesigner.layout.containers,
        order: formLayout.formDesigner.layout.order,
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
    if (updatedComponent.component === 'FileUpload') {
      const {
        maxNumberOfAttachments,
        maxFileSizeInMB,
        validFileEndings,
      } = updatedComponent as IFormFileUploaderComponent;
      yield call(FormDesignerActionDispatchers.updateApplicationMetadata,
        id, maxNumberOfAttachments, maxFileSizeInMB, validFileEndings);
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

export function* toggleFormContainerRepeatingSaga({
  id,
}: FormDesignerActions.IUpdateFormContainerAction): SagaIterator {
  try {
    const formDesignerState: IFormDesignerState = yield select(selectFormDesigner);
    const updatedContainer = formDesignerState.layout.containers[id];
    updatedContainer.repeating = !updatedContainer.repeating;
    yield call(
      FormDesignerActionDispatchers.updateFormContainerFulfilled,
      updatedContainer,
      id,
    );
  } catch (err) {
    yield call(FormDesignerActionDispatchers.updateFormContainerRejected, err);
  }
}

export function* watchToggleFormContainerRepeatingSaga(): SagaIterator {
  yield takeLatest(
    FormDesignerActionTypes.TOGGLE_FORM_CONTAINER_REPEAT,
    toggleFormContainerRepeatingSaga,
  );
}

export function* createRepeatingGroupSaga({ id }: FormDesignerActions.ICreateRepeatingGroupAction): SagaIterator {
  try {
    const formDesignerState: IFormDesignerState = yield select(selectFormDesigner);
    const containers = formDesignerState.layout.containers;
    const newContainer: ICreateFormContainer = {
      repeating: containers[id].repeating,
      index: (containers[id].index != null) ? (containers[id].index + 1) : null,
      hidden: containers[id].hidden,
      dataModelGroup: containers[id].dataModelGroup,
    };
    const newContainerId = uuid();
    yield call(createRepeatingContainer, newContainerId, id, newContainer);
  } catch (err) {
    yield call(FormDesignerActionDispatchers.createRepeatingGroupRejected, err);
  }
}

function* createRepeatingContainer(
  newContainerId: string,
  containerToCopyId: string,
  container: ICreateFormContainer,
  addToId?: string): SagaIterator {
  try {
    const formDesignerState: IFormDesignerState = yield select(selectFormDesigner);
    const serviceConfigurations: IServiceConfigurationState = yield select(selectServiceConfiguration);
    const { layout: { components, containers, order } } = formDesignerState;
    const baseContainerId = Object.keys(order)[0];
    let positionAfter = containerToCopyId;

    if (!baseContainerId) {
      return;
    }
    if (!addToId) {
      addToId = getParentContainerId(containerToCopyId, formDesignerState);
    }
    if (addToId !== baseContainerId) {
      positionAfter = null;
    }

    const conditionalRenderingRules: any = [];
    // create a simple lookup-structure for our conditional rendering rules
    if (serviceConfigurations.conditionalRendering) {
      Object.keys(serviceConfigurations.conditionalRendering).forEach((key: string) => {
        Object.keys(serviceConfigurations.conditionalRendering[key].selectedFields).forEach(
          (selectedFieldKey: string) => {
            const selectedTarget = serviceConfigurations.conditionalRendering[key].selectedFields[selectedFieldKey];
            conditionalRenderingRules[selectedTarget] = { conditionalRenderingId: key };
          });
      });
    }

    yield call(FormDesignerActionDispatchers.addFormContainerFulfilled,
      container, newContainerId, positionAfter, addToId, baseContainerId);

    let createdElementId: string;

    for (const elementId of order[containerToCopyId]) {
      if (components[elementId]) {
        const createdConmponentId = uuid();
        const newComponent = { ...components[elementId] };
        createdElementId = createdConmponentId;
        yield call(FormDesignerActionDispatchers.addFormComponentFulfilled,
          newComponent, null, createdConmponentId, newContainerId);
      } else if (containers[elementId]) {
        const newContainer: ICreateFormContainer = {
          repeating: containers[elementId].repeating,
          index: (containers[elementId].index != null) ? (containers[elementId].index + 1) : null,
          hidden: containers[elementId].hidden,
          dataModelGroup: containers[elementId].dataModelGroup,
        };

        // Recursive call, since containers can have sub-containers.
        const createdContainerId = uuid();
        createdElementId = createdContainerId;
        yield call(createRepeatingContainer, createdContainerId, elementId, newContainer, newContainerId);
      }
      if (conditionalRenderingRules[elementId]) {
        // We have a relevant condtional rendering rule that has to be copied for the newly created element
        const condtionalRuleInfo = conditionalRenderingRules[elementId];
        const newConditionalRuleId: string = uuid();
        const newCondtitionalRule: any = {
          ...serviceConfigurations.conditionalRendering[condtionalRuleInfo.conditionalRenderingId],
        };
        const selectedFieldsObject: any = {};
        selectedFieldsObject[newConditionalRuleId] = createdElementId;
        newCondtitionalRule.selectedFields = selectedFieldsObject;
        const newConditionalRuleObject: any = {};
        newConditionalRuleObject[newConditionalRuleId] = newCondtitionalRule;
        yield call(
          conditionalRenderingActionDispatcher.addConditionalRendering, newConditionalRuleObject);
      }
    }
  } catch (err) {
    yield call(FormDesignerActionDispatchers.createRepeatingGroupRejected, err);
    console.error(err);
  }
}

export function* watchCreateRepeatingGroupSaga(): SagaIterator {
  yield takeLatest(
    FormDesignerActionTypes.CREATE_REPEATING_GROUP,
    createRepeatingGroupSaga,
  );
}

export function* updateFormComponentOrderSaga({
  updatedOrder,
}: FormDesignerActions.IUpdateFormComponentOrderAction): SagaIterator {
  try {
    yield call(FormDesignerActionDispatchers.updateFormComponentOrderActionFulfilled,
      updatedOrder,
    );
    const saveFormLayoutUrl: string = yield call(getSaveFormLayoutUrl);
    yield call(
      FormDesignerActionDispatchers.saveFormLayout,
      saveFormLayoutUrl,
    );
  } catch (err) {
    yield call(FormDesignerActionDispatchers.updatedFormComponentOrderActionRejected,
      err,
    );
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
  maxSize,
  fileType,
}: FormDesignerActions.IAddApplicationMetadataAction): SagaIterator {
  try {
    const addApplicationMetadataUrl: string = yield call(getAddApplicationMetadataUrl);
    yield call(SharedNetwork.post, addApplicationMetadataUrl,
      {
        id,
        maxCount: maxFiles,
        maxSize,
        fileType,
      },
    );
    yield call(
      FormDesignerActionDispatchers.addApplicationMetadataFulfilled,
    );
  } catch (error) {
    yield call(FormDesignerActionDispatchers.addApplicationMetadataRejected,
      error,
    );
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
      },
    );
    yield call(
      FormDesignerActionDispatchers.deleteApplicationMetadataFulfilled,
    );
  } catch (error) {
    yield call(FormDesignerActionDispatchers.deleteApplicationMetadataRejected,
      error,
    );
  }
}

export function* watchDeleteApplicationMetadataSaga(): SagaIterator {
  yield takeLatest(FormDesignerActionTypes.DELETE_APPLICATION_METADATA, deleteApplicationMetadata);
}

export function* updateApplicationMetadata({
  id,
  maxFiles,
  maxSize,
  fileType,
}: FormDesignerActions.IAddApplicationMetadataAction): SagaIterator {
  try {
    const updateApplicationMetadataUrl: string = yield call(getUpdateApplicationMetadataUrl);
    yield call(SharedNetwork.post, updateApplicationMetadataUrl,
      {
        id,
        maxCount: maxFiles,
        maxSize,
        fileType,
      },
    );
    yield call(
      FormDesignerActionDispatchers.updateApplicationMetadataFulfilled,
    );

  } catch (error) {
    yield call(FormDesignerActionDispatchers.updateApplicationMetadataRejected,
      error,
    );
  }
}

export function* watchUpdateApplicationMetadataSaga(): SagaIterator {
  yield takeLatest(FormDesignerActionTypes.UPDATE_APPLICATION_METADATA, updateApplicationMetadata);
}
