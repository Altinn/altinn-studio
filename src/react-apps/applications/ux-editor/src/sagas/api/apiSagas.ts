import { SagaIterator } from 'redux-saga';
import { call, select, takeLatest } from 'redux-saga/effects';
import * as ApiActions from '../../actions/apiActions/actions';
import ApiActionDispatchers from '../../actions/apiActions/apiActionDispatcher';
import * as ApiActionTypes from '../../actions/apiActions/apiActionTypes';
import ErrorActionDispatchers from '../../actions/errorActions/errorActionDispatcher';
import FormDesignerActionDispatchers from '../../actions/formDesignerActions/formDesignerActionDispatcher';
import FormFillerActionDispatchers from '../../actions/formFillerActions/formFillerActionDispatcher';
import ServiceConfigActionDispatchers from '../../actions/manageServiceConfigurationActions/manageServiceConfigurationActionDispatcher';
import appConfig from '../../appConfig';
import { IApiState } from '../../reducers/apiReducer';
import { IAppDataState } from '../../reducers/appDataReducer';
import { IFormDesignerState } from '../../reducers/formDesignerReducer';
import { IFormFillerState } from '../../reducers/formFillerReducer';
import { checkIfAxiosError, get } from '../../utils/networking';
import { getSaveServiceConfigurationUrl } from '../../utils/urlHelper';

const selectFormDesigner = (state: IAppState): IFormDesignerState => state.formDesigner;
const selectFormFiller = (state: IAppState): IFormFillerState => state.formFiller;
const selectApi = (state: IAppState): IApiState => state.serviceConfigurations.APIs;
const selectAppData = (state: IAppState): IAppDataState => state.appData;

function* addApiConnectionSaga({ newConnection }: ApiActions.IAddApiConnection): SagaIterator {
  try {
    yield call(ApiActionDispatchers.addApiConnectionFulfilled, newConnection);
    const saveServiceConfigurationUrl: string = yield call(getSaveServiceConfigurationUrl);
    yield call(
      ServiceConfigActionDispatchers.saveJsonFile,
      saveServiceConfigurationUrl,
    );
  } catch (err) {
    yield call(ApiActionDispatchers.addApiConnectionRejected, err);
  }
}

export function* watchAddApiConnectionSaga(): SagaIterator {
  yield takeLatest(
    ApiActionTypes.ADD_API_CONNECTION,
    addApiConnectionSaga,
  );
}

function* delApiConnectionSaga({ connectionId }: ApiActions.IDelApiConnection): SagaIterator {
  try {
    // get state
    const apiState: IApiState = yield select(selectApi);

    // create array
    const connectionsArray = Object.keys(apiState.connections);

    // filter out the "connectionID" to delete
    const newConnectionsArray = connectionsArray.filter((connection: any) => connection !== connectionId);

    // create new object with newConnectionsArray content
    const newConnectionsObj = newConnectionsArray.reduce((acc: any, connection: any) => {
      acc[connection] = apiState.connections[connection];
      return acc;
    }, {});

    yield call(ApiActionDispatchers.delApiConnectionFulfilled, newConnectionsObj);
    const saveServiceConfigurationUrl: string = yield call(getSaveServiceConfigurationUrl);
    yield call(
      ServiceConfigActionDispatchers.saveJsonFile,
      saveServiceConfigurationUrl,
    );
  } catch (err) {
    yield call(ApiActionDispatchers.delApiConnectionRejected, err);
  }
}

export function* watchDelApiConnectionSaga(): SagaIterator {
  yield takeLatest(
    ApiActionTypes.DELETE_API_CONNECTION,
    delApiConnectionSaga,
  );
}

function* checkIfApisShouldFetchSaga({
  lastUpdatedDataBinding,
  lastUpdatedDataValue,
  lastUpdatedComponentId,
  repeating,
  dataModelGroup,
  index,
}: ApiActions.ICheckIfApiShouldFetchAction): SagaIterator {
  try {
    // get state
    const formFillerState: IFormFillerState = yield select(selectFormFiller);
    const apiState: IApiState = yield select(selectApi);
    const appDataState: IAppDataState = yield select(selectAppData);
    const formDesignerState: IFormDesignerState = yield select(selectFormDesigner);
    for (const connection in apiState.connections) {
      if (!connection) {
        continue;
      }

      const connectionDef = apiState.connections[connection];
      const apiType = connectionDef.externalApiId ?
        apiState.externalApisById[connectionDef.externalApiId].type : 'codelist';
      if (apiType !== 'list' || apiType !== 'codelist' && formFillerState.validationErrors
        && Object.keys(formFillerState.validationErrors).length === 0) {
        // Do check for APIs returning single values
        yield call(apiCheckValue, connectionDef, lastUpdatedDataBinding, lastUpdatedDataValue,
          formFillerState.formData, apiState.externalApisById,
          formDesignerState.layout.components, appDataState.dataModel.model, repeating, dataModelGroup, index);
      }
    }
  } catch (err) {
    ErrorActionDispatchers.addError('Ånei! Noe gikk galt, vennligst prøv igjen seinere.');
    console.error(err);
  }
}

export function* watchCheckIfApisShouldFetchSaga(): SagaIterator {
  yield takeLatest(
    ApiActionTypes.CHECK_IF_API_SHOULD_FETCH,
    checkIfApisShouldFetchSaga,
  );
}

function* fetchApiListResponseSaga(): SagaIterator {
  const apiState: IApiState = yield select(selectApi);
  const formDesignerState: IFormDesignerState = yield select(selectFormDesigner);

  for (const connection in apiState.connections) {
    if (!connection) {
      continue;
    }

    const connectionDef = apiState.connections[connection];
    const apiType = connectionDef.externalApiId ?
      apiState.externalApisById[connectionDef.externalApiId].type : 'codelist';
    if (apiType === 'list' || apiType === 'codelist') {
      yield call(apiFetchList, connectionDef, apiState.externalApisById,
        formDesignerState.layout.components);
    }
  }
}

export function* watchFetchApiListResponseSaga(): SagaIterator {
  yield takeLatest(
    ApiActionTypes.FETCH_API_LIST_RESPONSE,
    fetchApiListResponseSaga,
  );
}

function* apiFetchList(connectionDef: any, externalApisById: any, components: any) {
  let dataBindingName;
  for (const dataMapping in connectionDef.apiResponseMapping) {
    if (!dataMapping || dataMapping === 'labelKey' || dataMapping === 'valueKey') {
      continue;
    }
    dataBindingName = dataMapping;
  }

  const mappedComponent: any = {};
  for (const component in components) {
    if (components[component].dataModelBinding === dataBindingName) {
      mappedComponent.component = components[component];
      mappedComponent.id = component;
      break;
    }
  }

  if (!mappedComponent) {
    return;
  }

  let uri: string;
  if (connectionDef.externalApiId) {
    uri = externalApisById[connectionDef.externalApiId].uri;
    for (const metaParam in connectionDef.metaParams) {
      if (!metaParam) {
        continue;
      }
      uri += `&${metaParam}=${connectionDef.metaParams[metaParam]}`;
    }
  } else if (connectionDef.codeListId) {
    uri = getCodeListUri(connectionDef.codeListId);
  }

  try {
    const response: any = yield call(get, uri);
    const responseList: any[] = response[connectionDef.apiResponseMapping[dataBindingName].mappingKey];
    if (!responseList) {
      return;
    }
    const options: IOptions[] = [{ label: '<Select>', value: '' }];
    const valueKey = connectionDef.apiResponseMapping[dataBindingName].valueKey;
    const labelKey = connectionDef.apiResponseMapping[dataBindingName].labelKey;
    responseList.forEach((item) => {
      const option: IOptions = {
        label: item[labelKey],
        value: item[valueKey],
      };
      options.push(option);
    });

    mappedComponent.component.options = options;
    yield call(FormDesignerActionDispatchers.updateFormComponent, mappedComponent.component, mappedComponent.id);

  } catch (err) {
    if (checkIfAxiosError(err)) {
      console.error('Axios error', err);
      ErrorActionDispatchers.addError('Ånei! Noe gikk galt, vennligst prøv igjen seinere.');
    } else {
      console.error('Error fetching and mapping to datamodel', err);
      ErrorActionDispatchers.addError('Ånei! Noe gikk galt, vennligst prøv igjen seinere.');
    }
  }
}

function* apiCheckValue(
  connectionDef: any,
  lastUpdatedDataBinding: IDataModelFieldElement,
  lastUpdatedDataValue: any,
  formData: any,
  externalApisById: any,
  components: IFormDesignerComponent,
  model: any,
  repeating: boolean,
  dataModelGroup?: string,
  index?: number,
) {
  for (const param in connectionDef.clientParams) {
    if (!param) {
      continue;
    }

    const isPartOfRepeatingGroup: boolean = (repeating && dataModelGroup !== null && index !== null);
    const dataModelGroupWithIndex: string = dataModelGroup + `[${index}]`;

    let relevantClientParam = connectionDef.clientParams[param];
    if (isPartOfRepeatingGroup) {
      relevantClientParam = relevantClientParam.replace(dataModelGroup, dataModelGroupWithIndex);
    }

    if (!formData[relevantClientParam]) {
      // This space intentionally left empty
    } else {
      if (connectionDef.clientParams[param] === lastUpdatedDataBinding.DataBindingName) {
        if (Object.keys(connectionDef.clientParams).length > 1) {
          // This space intentionally left empty
        } else {
          let uri: string = externalApisById[connectionDef.externalApiId].uri;
          const paramName: string = Object.keys(connectionDef.clientParams)[0];
          uri += `${paramName}=${lastUpdatedDataValue}`;
          for (const metaParam in connectionDef.metaParams) {
            if (!metaParam) {
              continue;
            }
            uri += `&${metaParam}=${connectionDef.metaParams[metaParam]}`;
          }
          try {
            const response: any = yield call(get, uri);
            for (const dataMapping in connectionDef.apiResponseMapping) {
              if (!dataMapping) {
                continue;
              }
              let updatedDataBinding: IDataModelFieldElement =
                model.find(
                  (element: IDataModelFieldElement) => element.DataBindingName === dataMapping);
              let updatedComponent: string;
              for (const component in components) {
                if (!component) {
                  continue;
                }
                if (components[component].dataModelBinding === updatedDataBinding.DataBindingName) {
                  updatedComponent = component;
                }
              }
              if (!updatedDataBinding) {
                // This space intentionally left blank
              } else {
                if (!updatedComponent) {
                  // This space intentionally left blank
                } else {
                  if (isPartOfRepeatingGroup) {
                    updatedDataBinding = { ...updatedDataBinding };
                    updatedDataBinding.DataBindingName = updatedDataBinding.DataBindingName.replace(
                      dataModelGroup,
                      dataModelGroupWithIndex,
                    );
                  }
                  yield call(FormFillerActionDispatchers.updateFormData,
                    updatedComponent,
                    response[connectionDef.apiResponseMapping[dataMapping].mappingKey],
                    updatedDataBinding,
                    updatedDataBinding.DataBindingName,
                  );
                }
              }
            }
          } catch (err) {
            if (checkIfAxiosError(err)) {
              // This space intentionally left blank
              console.error('Axios error', err);
              ErrorActionDispatchers.addError('Ånei! Noe gikk galt, vennligst prøv igjen seinere.');
            } else {
              console.error('Error fetching and mapping to datamodel', err);
              ErrorActionDispatchers.addError('Ånei! Noe gikk galt, vennligst prøv igjen seinere.');
            }
          }
        }
      }
    }
  }
}

function getCodeListUri(codeListId: string) {
  const altinnWindow: IAltinnWindow = window as IAltinnWindow;
  const { org, service } = altinnWindow;
  const servicePath = `${org}/${service}`;
  const codeListConfig = appConfig.serviceConfiguration.getCodeLists(window);

  if (altinnWindow.location.pathname.split('/')[1].toLowerCase() === 'runtime') {
    return `${codeListConfig.codeListUrlRuntime.replace(
      codeListConfig.servicePathPlaceholder, servicePath)}${codeListId}`;
  }

  return `${codeListConfig.codeListUrlPreview.replace(
    codeListConfig.servicePathPlaceholder, servicePath)}${codeListId}`;
}
