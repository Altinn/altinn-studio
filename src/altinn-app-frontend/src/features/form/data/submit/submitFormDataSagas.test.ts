import {
  getFormDataStateMock,
  getInitialStateMock,
  getInstanceDataStateMock,
} from '__mocks__/mocks';
import { call, select } from 'redux-saga/effects';
import { expectSaga } from 'redux-saga-test-plan';

import { FormDataActions } from 'src/features/form/data/formDataSlice';
import {
  putFormData,
  saveFormDataSaga,
  saveStatelessData,
} from 'src/features/form/data/submit/submitFormDataSagas';
import { FormDynamicsActions } from 'src/features/form/dynamics/formDynamicsSlice';
import { makeGetAllowAnonymousSelector } from 'src/selectors/getAllowAnonymous';
import {
  getCurrentDataTypeForApplication,
  getCurrentTaskDataElementId,
} from 'src/utils/appMetadata';
import {
  dataElementUrl,
  getStatelessFormDataUrl,
} from 'src/utils/appUrlHelper';
import { convertDataBindingToModel } from 'src/utils/databindings';
import { post } from 'src/utils/networking';
import type { IInstanceDataState } from 'src/shared/resources/instanceData';
import type { IRuntimeState } from 'src/types';

import { put } from 'altinn-shared/utils/networking';
import type { IData } from 'altinn-shared/index';

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
      created: new Date('2021-01-01').toISOString(),
      createdBy: 'testUser',
      lastChanged: new Date('2021-01-01').toISOString(),
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
          field2: '123',
        },
      }),
    };

    const model = convertDataBindingToModel(state.formData.formData);
    const defaultDataElementGuid = getCurrentTaskDataElementId(
      state.applicationMetadata.applicationMetadata,
      state.instanceData.instance,
      state.formLayout.layoutsets,
    );
    return expectSaga(saveFormDataSaga)
      .provide([
        [select(), state],
        [call(put, dataElementUrl(defaultDataElementGuid), model), {}],
      ])
      .call(putFormData, state, model)
      .put(FormDataActions.submitFulfilled())
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
        formData: formData,
      },
      formLayout: {
        ...stateMock.formLayout,
        layoutsets: {
          sets: [
            {
              id: 'stateless',
              dataType: 'test-data-model',
              tasks: [],
            },
          ],
        },
      },
    };

    const model = convertDataBindingToModel(state.formData.formData);
    const currentDataType = getCurrentDataTypeForApplication({
      application: state.applicationMetadata.applicationMetadata,
      instance: state.instanceData.instance,
      layoutSets: state.formLayout.layoutsets,
    });

    return expectSaga(saveFormDataSaga)
      .provide([
        [select(), state],
        [select(makeGetAllowAnonymousSelector()), false],
        [
          call(
            post,
            getStatelessFormDataUrl(currentDataType),
            {
              headers: {
                party: `partyid:${stateMock.party.selectedParty.partyId}`,
              },
            },
            model,
          ),
          {
            data: {
              ...formData,
              group: {
                field1: 'value1',
              },
            },
          },
        ],
      ])
      .call(saveStatelessData, state, model)
      .put(
        FormDataActions.fetchFulfilled({
          formData: {
            ...formData,
            'group.field1': 'value1',
          },
        }),
      )
      .put(FormDynamicsActions.checkIfConditionalRulesShouldRun({}))
      .put(FormDataActions.submitFulfilled())
      .run();
  });

  it('saveFormDataSaga for stateless app with allowAnonymous', () => {
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
        formData: formData,
      },
      formLayout: {
        ...stateMock.formLayout,
        layoutsets: {
          sets: [
            {
              id: 'stateless',
              dataType: 'test-data-model',
              tasks: [],
            },
          ],
        },
      },
    };

    const model = convertDataBindingToModel(state.formData.formData);
    const currentDataType = getCurrentDataTypeForApplication({
      application: state.applicationMetadata.applicationMetadata,
      instance: state.instanceData.instance,
      layoutSets: state.formLayout.layoutsets,
    });

    return expectSaga(saveFormDataSaga)
      .provide([
        [select(), state],
        [select(makeGetAllowAnonymousSelector()), true],
        [
          call(
            post,
            getStatelessFormDataUrl(currentDataType, true),
            undefined,
            model,
          ),
          {
            data: {
              ...formData,
              group: {
                field1: 'value1',
              },
            },
          },
        ],
      ])
      .call(saveStatelessData, state, model)
      .put(
        FormDataActions.fetchFulfilled({
          formData: {
            ...formData,
            'group.field1': 'value1',
          },
        }),
      )
      .put(FormDynamicsActions.checkIfConditionalRulesShouldRun({}))
      .put(FormDataActions.submitFulfilled())
      .run();
  });
});
