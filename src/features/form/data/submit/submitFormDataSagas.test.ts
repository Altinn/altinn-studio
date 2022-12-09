import { call, select } from 'redux-saga/effects';
import { expectSaga } from 'redux-saga-test-plan';

import { getFormDataStateMock, getInitialStateMock, getInstanceDataStateMock } from 'src/__mocks__/mocks';
import { FormDataActions } from 'src/features/form/data/formDataSlice';
import { putFormData, saveFormDataSaga, saveStatelessData } from 'src/features/form/data/submit/submitFormDataSagas';
import { FormDynamicsActions } from 'src/features/form/dynamics/formDynamicsSlice';
import { makeGetAllowAnonymousSelector } from 'src/selectors/getAllowAnonymous';
import { getCurrentDataTypeForApplication, getCurrentTaskDataElementId } from 'src/utils/appMetadata';
import { convertDataBindingToModel } from 'src/utils/databindings';
import { post } from 'src/utils/network/networking';
import { put } from 'src/utils/network/sharedNetworking';
import { dataElementUrl, getStatelessFormDataUrl } from 'src/utils/urls/appUrlHelper';
import type { IApplicationMetadata } from 'src/shared/resources/applicationMetadata';
import type { IInstanceDataState } from 'src/shared/resources/instanceData';
import type { IRuntimeState } from 'src/types';
import type { IData, IInstance } from 'src/types/shared';

describe('submitFormDataSagas', () => {
  let stateMock: IRuntimeState;
  beforeEach(() => {
    stateMock = getInitialStateMock();
  });

  it('saveFormDataSaga', () => {
    const instanceDataMock: IInstanceDataState = getInstanceDataStateMock();
    const dataElement: IData = {
      id: 'test-data-element-1',
      instanceGuid: instanceDataMock.instance?.id || '',
      dataType: 'test-data-model',
      filename: 'testData1.pdf',
      contentType: 'application/pdf',
      blobStoragePath: '',
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
        ...(instanceDataMock.instance as IInstance),
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
    ) as string;
    const field = 'someField';
    const componentId = 'someComponent';
    const data = 'someData';

    return expectSaga(saveFormDataSaga, {
      payload: { componentId, field, data },
      type: '',
    })
      .provide([
        [select(), state],
        [
          call(put, dataElementUrl(defaultDataElementGuid), model, {
            headers: {
              'X-DataField': encodeURIComponent(field),
              'X-ComponentId': encodeURIComponent(componentId),
            },
          }),
          {},
        ],
      ])
      .call(putFormData, { state, model, field, componentId })
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
          ...(stateMock.applicationMetadata.applicationMetadata as IApplicationMetadata),
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
    }) as string;

    const field = 'someField';
    const componentId = 'someComponent';
    const data = 'someData';

    return expectSaga(saveFormDataSaga, {
      payload: {
        field,
        componentId,
        data,
      },
      type: '',
    })
      .provide([
        [select(), state],
        [select(makeGetAllowAnonymousSelector()), false],
        [
          call(
            post,
            getStatelessFormDataUrl(currentDataType),
            {
              headers: {
                party: `partyid:${stateMock.party.selectedParty?.partyId}`,
                'X-DataField': encodeURIComponent(field),
                'X-ComponentId': encodeURIComponent(componentId),
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
      .call(saveStatelessData, { state, model, field, componentId })
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
          ...(stateMock.applicationMetadata.applicationMetadata as IApplicationMetadata),
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
    }) as string;

    const field = 'someField';
    const componentId = 'someComponent';
    const data = 'someData';

    return expectSaga(saveFormDataSaga, {
      payload: {
        field,
        componentId,
        data,
      },
      type: '',
    })
      .provide([
        [select(), state],
        [select(makeGetAllowAnonymousSelector()), true],
        [
          call(
            post,
            getStatelessFormDataUrl(currentDataType, true),
            {
              headers: {
                'X-DataField': encodeURIComponent(field),
                'X-ComponentId': encodeURIComponent(componentId),
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
      .call(saveStatelessData, { state, model, field, componentId })
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
