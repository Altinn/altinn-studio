import { SagaIterator } from 'redux-saga';
import { call, select, takeLatest } from 'redux-saga/effects';
import ErrorActionDispatchers from '../../actions/errorActions/errorActionDispatcher';
import FormFillerActionDispatchers from '../../actions/formFillerActions/formFillerActionDispatcher';
import * as RuleConnetionActions from '../../actions/ruleConnectionActions/actions';
import RuleConnectionActionDispatchers from '../../actions/ruleConnectionActions/ruleConnectionActionDispatcher';
import * as RuleConnectionActionTypes from '../../actions/ruleConnectionActions/ruleConnectionActionTypes';
import { IAppDataState } from '../../reducers/appDataReducer';
import { IFormDesignerState } from '../../reducers/formDesignerReducer';
import { IFormFillerState } from '../../reducers/formFillerReducer';
import { IRuleConnectionState } from '../../reducers/ruleConnectionReducer';

const selectFormDesigner = (state: IAppState): IFormDesignerState => state.formDesigner;
const selectFormFiller = (state: IAppState): IFormFillerState => state.formFiller;
const selectRuleConnection = (state: IAppState): IRuleConnectionState => state.serviceConfigurations.ruleConnection;
const selectAppData = (state: IAppState): IAppDataState => state.appData;

function* addRuleConnectionSaga({ newConnection }: RuleConnetionActions.IAddRuleConnection): SagaIterator {
  try {
    yield call(RuleConnectionActionDispatchers.addRuleConnectionFulfilled, newConnection);
  } catch (err) {
    yield call(RuleConnectionActionDispatchers.addRuleConnectionRejected, err);
  }
}

export function* watchAddRuleConnectionSaga(): SagaIterator {
  yield takeLatest(
    RuleConnectionActionTypes.ADD_RULE_CONNECTION,
    addRuleConnectionSaga,
  );
}

function* delRuleConnectionSaga({ connectionId }: RuleConnetionActions.IDelRuleConnection): SagaIterator {
  try {
    // get state
    const ruleConnectionState: IRuleConnectionState = yield select(selectRuleConnection);

    // create array
    const ruleConnectionArray = Object.keys(ruleConnectionState);

    // filter out the "connectionID" to delete
    const newConnectionsArray = ruleConnectionArray.filter((ruleConnection: any) => ruleConnection !== connectionId);

    // create new object with newConnectionsArray content
    const newConnectionObj = newConnectionsArray.reduce((acc: any, ruleConnection: any) => {
      acc[ruleConnection] = ruleConnectionState[ruleConnection];
      return acc;
    }, {});

    yield call(RuleConnectionActionDispatchers.delRuleConnectionFulfilled, newConnectionObj);
  } catch (err) {
    yield call(RuleConnectionActionDispatchers.delRuleConnectionRejected, err);
  }
}

export function* watchDelRuleConnectionSaga(): SagaIterator {
  yield takeLatest(
    RuleConnectionActionTypes.DEL_RULE_CONNECTION,
    delRuleConnectionSaga,
  );
}

function* checkIfRuleShouldRunSaga({ lastUpdatedDataBinding, lastUpdatedDataValue, lastUpdatedComponentId }:
  RuleConnetionActions.ICheckIfRuleShouldRun): SagaIterator {
  try {
    // get state
    const formFillerState: IFormFillerState = yield select(selectFormFiller);
    const ruleConnectionState: IRuleConnectionState = yield select(selectRuleConnection);
    const appDataState: IAppDataState = yield select(selectAppData);
    const formDesignerState: IFormDesignerState = yield select(selectFormDesigner);
    for (const connection in ruleConnectionState) {
      if (!connection) continue;
      const connectionDef = ruleConnectionState[connection];
      const functionToRun: string = connectionDef.selectedFunction;
      let shouldRunFunction = false;
      let numberOfInputFieldsFilledIn = 0;
      for (const inputParam in connectionDef.inputParams) {
        if (!inputParam) continue;
        if (formFillerState.formData[connectionDef.inputParams[inputParam]]) {
          numberOfInputFieldsFilledIn++;
        }
        if (connectionDef.inputParams[inputParam] === lastUpdatedDataBinding.DataBindingName) {
          shouldRunFunction = true;
        }
      }
      for (const outParam of Object.keys(connectionDef.outParams)) {
        if (!outParam && !formFillerState.formData[connectionDef.outParams[outParam]]) {
          shouldRunFunction = false;
        }
      }
      if (shouldRunFunction) {
        const objectToUpdate = (window as any).ruleHandlerHelper[functionToRun]();
        if (Object.keys(objectToUpdate).length === numberOfInputFieldsFilledIn) {
          const newObj = Object.keys(objectToUpdate).reduce((acc: any, elem: any) => {
            acc[elem] = formFillerState.formData[connectionDef.inputParams[elem]];
            return acc;
          }, {});

          const result = (window as any).ruleHandlerObject[functionToRun](newObj);
          const updatedDataBinding: IDataModelFieldElement = appDataState.dataModel.model.find(
            (element: IDataModelFieldElement) => element.DataBindingName === connectionDef.outParams.outParam0);
          let updatedComponent: string;
          for (const component in formDesignerState.layout.components) {
            if (!component) continue;
            if (formDesignerState.layout.components[component].dataModelBinding === connectionDef.outParams.outParam0) {
              updatedComponent = component;
            }
          }
          if (!updatedDataBinding) {
            // Validation error on field that triggered the check?
          } else {
            if (!updatedComponent) {
              // Validation error on field that triggered the check?
            } else {
              yield call(
                FormFillerActionDispatchers.updateFormData, updatedComponent, result, updatedDataBinding);
            }
          }
        }
      }
    }
  } catch (err) {
    ErrorActionDispatchers.addError('Ånei! Noe gikk galt, vennligst prøv igjen seinere.');
    console.error(err);
  }
}

export function* watchCheckIfRuleShouldRunSaga(): SagaIterator {
  yield takeLatest(
    RuleConnectionActionTypes.CHECK_IF_RULE_SHOULD_RUN,
    checkIfRuleShouldRunSaga,
  );
}
