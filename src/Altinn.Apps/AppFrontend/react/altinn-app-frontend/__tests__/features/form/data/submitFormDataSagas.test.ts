import { call, select } from 'redux-saga/effects';
import { expectSaga } from 'redux-saga-test-plan';
import { saveFormDataSaga, putFormData, saveStatelessData } from '../../../../src/features/form/data/submit/submitFormDataSagas';
import { IRuntimeState } from '../../../../src/types';
import { getFormDataStateMock, getInitialStateMock, getInstanceDataStateMock } from '../../../../__mocks__/mocks';
import { convertDataBindingToModel } from '../../../../src/utils/databindings';
import FormDataActions from '../../../../src/features/form/data/formDataActions';
import FormDynamicsActions from '../../../../src/features/form/dynamics/formDynamicsActions';
import { put } from '../../../../../shared/src/utils/networking';
import { post } from '../../../../src/utils/networking';
import { dataElementUrl, getStatelessFormDataUrl } from '../../../../src/utils/urlHelper';
import { getCurrentDataTypeForApplication, getCurrentTaskDataElementId } from '../../../../src/utils/appMetadata';
import { IInstanceDataState } from '../../../../src/shared/resources/instanceData/instanceDataReducers';
import { IData } from '../../../../../shared/src';

describe('submitFormDataSagas', () => {
  let stateMock: IRuntimeState;
  beforeEach(() => {
    stateMock = getInitialStateMock();
  });

  it('saveFormDataSaga', () => {
    const instanceDataMock: IInstanceDataState = getInstanceDataStateMock();
    const dataElement: IData = {
      id: 'test-data-element-1',
      instanceGuid: instanceDataMock.instance.id,
      dataType: 'test-data-model',
      filename: 'testData1.pdf',
      contentType: 'application/pdf',
      blobStoragePath: '',
      selfLinks: {
        apps: null,
        platform: null,
      },
      size: 1234,
      locked: false,
      refs: [],
      created: new Date('2021-01-01'),
      createdBy: 'testUser',
      lastChanged: new Date('2021-01-01'),
      lastChangedBy: 'testUser',
    };
    const mockInstanceData: IInstanceDataState = {
      ...instanceDataMock,
      instance: {
        ...instanceDataMock.instance,
        data: [dataElement],
      },
    };
    const state: IRuntimeState = {
      ...stateMock,
      instanceData: mockInstanceData,
      formData: getFormDataStateMock({
        formData: {
          field1: 'value1',
          field2: 123,
        },
      }),
    };

    const model = convertDataBindingToModel(state.formData.formData);
    const defaultDataElementGuid = getCurrentTaskDataElementId(
      state.applicationMetadata.applicationMetadata,
      state.instanceData.instance,
    );
    return expectSaga(saveFormDataSaga)
      .provide([
        [select(), state],
        [call(put, dataElementUrl(defaultDataElementGuid), model), {}],
      ])
      .call(putFormData, state, model)
      .put(FormDataActions.submitFormDataFulfilled())
      .run();
  });

  it('saveFormDataSaga for stateless app', () => {
    const formData = {
      field1: 'value1',
      field2: 'abc',
    };
    const state: IRuntimeState = {
      ...stateMock,
      applicationMetadata: {
        ...stateMock.applicationMetadata,
        applicationMetadata: {
          ...stateMock.applicationMetadata.applicationMetadata,
          onEntry: { show: 'stateless' },
        },
      },
      formData: {
        ...stateMock.formData,
        formData: {
          formData,
        },
      },
      formLayout: {
        ...stateMock.formLayout,
        layoutsets: {
          sets: [{
            id: 'stateless',
            dataType: 'test-data-model',
            tasks: [],
          }],
        },
      },
    };

    const model = convertDataBindingToModel(state.formData.formData);
    const currentDataType = getCurrentDataTypeForApplication(
      state.applicationMetadata.applicationMetadata,
      state.instanceData.instance,
      state.formLayout.layoutsets,
    );

    return expectSaga(saveFormDataSaga)
      .provide([
        [select(), state],
        [call(post, getStatelessFormDataUrl(currentDataType), { headers: { party: `partyid:${stateMock.party.selectedParty.partyId}` } }, model), {
          data: {
            ...formData,
            group: {
              field1: 'value1',
            },
          },
        }],
      ])
      .call(saveStatelessData, state, model)
      .put(FormDataActions.fetchFormDataFulfilled({ formData:
        {
          ...formData,
          'group.field1': 'value1',
        } }))
      .call(FormDynamicsActions.checkIfConditionalRulesShouldRun)
      .put(FormDataActions.submitFormDataFulfilled())
      .run();
  });
});
