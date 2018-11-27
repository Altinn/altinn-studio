import { SagaIterator } from 'redux-saga';
import { all, call, select, take, takeLatest } from 'redux-saga/effects';
import * as AppDataActionTypes from '../../actions/appDataActions/appDataActionTypes';
import * as ConditionalRenderingActions from '../../actions/conditionalRenderingActions/actions';
// tslint:disable-next-line:max-line-length
import ConditionalRenderingActionDispatcher from '../../actions/conditionalRenderingActions/conditionalRenderingActionDispatcher';
// tslint:disable-next-line:max-line-length
import * as ConditionalRenderingActionTypes from '../../actions/conditionalRenderingActions/conditionalRenderingActionTypes';
import ErrorActionDispatchers from '../../actions/errorActions/errorActionDispatcher';
import FormDesignerActionDispatchers from '../../actions/formDesignerActions/formDesignerActionDispatcher';
import * as FormDesignerActionTypes from '../../actions/formDesignerActions/formDesignerActionTypes';
// tslint:disable-next-line:max-line-length
import * as ServiceConfigurationActionTypes from '../../actions/manageServiceConfigurationActions/manageServiceConfigurationActionTypes';
import { IAppDataState } from '../../reducers/appDataReducer';
import { IFormDesignerState } from '../../reducers/formDesignerReducer';
import { IFormFillerState } from '../../reducers/formFillerReducer';

const selectAppData = (state: IAppState): IAppDataState => state.appData;
const selectConditionalRuleConnection = (state: IAppState): any => state.serviceConfigurations.conditionalRendering;
const selectFormDesigner = (state: IAppState): IFormDesignerState => state.formDesigner;
const selectFormFiller = (state: IAppState): IFormFillerState => state.formFiller;

function* addConditionalRenderingSaga({ newConnection }:
  ConditionalRenderingActions.IAddConditionalRendering): SagaIterator {
  try {
    yield call(ConditionalRenderingActionDispatcher.addConditionalRenderingFulfilled, newConnection);
  } catch (err) {
    yield call(ConditionalRenderingActionDispatcher.addConditionalRenderingRejected, err);
  }
}

export function* watchAddConditionalRenderingSaga(): SagaIterator {
  yield takeLatest(
    ConditionalRenderingActionTypes.ADD_CONDITIONAL_RENDERING,
    addConditionalRenderingSaga,
  );
}

function* delConditionalRenderingSaga({ connectionId }:
  ConditionalRenderingActions.IDelConditionalRendering): SagaIterator {
  try {
    // get state
    const conditionalRenderingState: any = yield select(selectConditionalRuleConnection);

    // create array
    const conditionalRenderingArray = Object.keys(conditionalRenderingState);

    // filter out the "connecitonID" to delete
    const newConnectionsArray = conditionalRenderingArray.filter(
      (conditionalRendringCon: any) => conditionalRendringCon !== connectionId);

    // create new object with newConnectionsArray content
    const newConnectionObj = newConnectionsArray.reduce((acc: any, conditionalRendringCon: any) => {
      acc[conditionalRendringCon] = conditionalRenderingState[conditionalRendringCon];
      return acc;
    }, {});

    yield call(ConditionalRenderingActionDispatcher.delConditionalRenderingFulfilled, newConnectionObj);
  } catch (err) {
    yield call(ConditionalRenderingActionDispatcher.delConditionalRenderingRejected, err);
  }
}

export function* watchDelConditionalRenderingSaga(): SagaIterator {
  yield takeLatest(
    ConditionalRenderingActionTypes.DEL_CONDITIONAL_RENDERING,
    delConditionalRenderingSaga,
  );
}

/**
 * Method that will run checkIfConditionalRulesShouldRun once the listed actions is completed,
 * method is used to apply the conditional rendering rules on load
 */
export function* watchForFulfillmentBeforeRunningRuleMethodsSaga(): SagaIterator {

  yield all([
    take(FormDesignerActionTypes.FETCH_FORM_LAYOUT_FULFILLED),
    take(ServiceConfigurationActionTypes.FETCH_JSON_FILE_FULFILLED),
    take(AppDataActionTypes.FETCH_RULE_MODEL_FULFILLED),
  ]);
  yield call(checkIfConditionalRulesShouldRun, {});
}

export function* checkIfConditionalRulesShouldRun(
  { repeatingContainerId }: ConditionalRenderingActions.ICheckIfConditionalRulesShouldRun)
  : SagaIterator {
  try {
    const appDataState: IAppDataState = yield select(selectAppData);
    // rules should not be applied when in design mode
    // tslint:disable-next-line:curly
    if (appDataState.appConfig.designMode) return;
    const conditionalRuleConnectionState: any = yield select(selectConditionalRuleConnection);
    const formFillerState: IFormFillerState = yield select(selectFormFiller);
    const formDesignerState: IFormDesignerState = yield select(selectFormDesigner);

    let repContainer: any;
    let repeating: boolean;
    let dataModelGroup: string;
    let index: number;

    if (repeatingContainerId) {
      if (formDesignerState.layout.containers[repeatingContainerId]) {
        repContainer = formDesignerState.layout.containers[repeatingContainerId];
        repeating = repContainer.repeating;
        dataModelGroup = repContainer.dataModelGroup;
        index = repContainer.index;
      }
    }

    const isPartOfRepeatingGroup = (repeating && dataModelGroup != null && index != null);

    // Iterate over all conditional rendering rule connections
    for (const connection in conditionalRuleConnectionState) {
      // tslint:disable-next-line:curly
      if (!connection) continue;

      const connectionDef = conditionalRuleConnectionState[connection];
      const functionToRun: string = connectionDef.selectedFunction;
      const objectToUpdate = (window as any).conditionalRuleHandlerHelper[functionToRun]();
      // Map input object structure to input object defined in the conditional rendering rule connection
      const newObj = Object.keys(objectToUpdate).reduce((acc: any, elem: any) => {
        let selectedParam: string = connectionDef.inputParams[elem];
        if (isPartOfRepeatingGroup) {
          selectedParam = selectedParam.replace(dataModelGroup, `${dataModelGroup}[${index}]`);
        }
        acc[elem] = formFillerState.formData ? formFillerState.formData[selectedParam] : null;
        return acc;
      }, {});
      const result = (window as any).conditionalRuleHandlerObject[functionToRun](newObj);
      const action = connectionDef.selectedAction;
      // Perform action on the necccessary componenets
      for (const elementToPerformActionOn in connectionDef.selectedFields) {
        // tslint:disable-next-line:curly
        if (!elementToPerformActionOn) continue;

        const elementId = connectionDef.selectedFields[elementToPerformActionOn];

        if (isPartOfRepeatingGroup) {
          // If this target-element is not in the repeating group - the element is ignored
          if (formDesignerState.layout.order[repeatingContainerId].indexOf(elementId) < 0) {
            continue;
          }
        }

        // Either component or container
        const elementIsComponent = formDesignerState.layout.components[elementId] ? true : false;
        const element = elementIsComponent ?
          formDesignerState.layout.components[elementId] :
          formDesignerState.layout.containers[elementId];

        if (!element) {
          continue;
        }

        switch (action) {
          case 'Show':
            element.hidden = !result;
            break;
          case 'Hide':
            element.hidden = result;
            break;
        }
        if (elementIsComponent) {
          yield call(FormDesignerActionDispatchers.updateFormComponent, element, elementId);
        } else {
          yield call(FormDesignerActionDispatchers.updateFormContainer, element, elementId);
        }
      }
    }
  } catch (err) {
    ErrorActionDispatchers.addError('Ånei! Noe gikk galt, vennligst prøv igjen seinere.');
    console.error(err);
  }
}

export function* watchCheckIfConditionalRulesShouldRun(): SagaIterator {
  yield takeLatest(
    ConditionalRenderingActionTypes.CHECK_IF_CONDITIONAL_RULE_SHOULD_RUN,
    checkIfConditionalRulesShouldRun,
  );
}
