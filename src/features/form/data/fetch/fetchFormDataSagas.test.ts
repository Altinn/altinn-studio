import { call, select } from 'redux-saga/effects';
import { expectSaga } from 'redux-saga-test-plan';
import type { AxiosError, AxiosRequestHeaders } from 'axios';

import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import {
  fetchFormDataInitialSaga,
  fetchFormDataSaga,
  watchFetchFormDataInitialSaga,
} from 'src/features/form/data/fetch/fetchFormDataSagas';
import { FormDataActions } from 'src/features/form/data/formDataSlice';
import { DataModelActions } from 'src/features/form/datamodel/datamodelSlice';
import { makeGetAllowAnonymousSelector } from 'src/selectors/getAllowAnonymous';
import {
  appMetaDataSelector,
  currentSelectedPartyIdSelector,
  instanceDataSelector,
  layoutSetsSelector,
  processStateSelector,
} from 'src/selectors/simpleSelectors';
import { InstanceDataActions } from 'src/shared/resources/instanceData/instanceDataSlice';
import { QueueActions } from 'src/shared/resources/queue/queueSlice';
import { getCurrentTaskDataElementId, getDataTypeByLayoutSetId } from 'src/utils/appMetadata';
import * as networking from 'src/utils/network/sharedNetworking';
import * as appUrlHelper from 'src/utils/urls/appUrlHelper';
import type { IApplicationMetadata } from 'src/shared/resources/applicationMetadata';
import type { ILayoutSets } from 'src/types';
import type { IApplication } from 'src/types/shared';

describe('fetchFormDataSagas', () => {
  let mockInitialState;
  const mockFormData = {
    someField: 'test test',
    otherField: 'testing 123',
    group: {
      groupField: 'this is a field in a group',
    },
  };
  const flattenedFormData = {
    someField: 'test test',
    otherField: 'testing 123',
    'group.groupField': 'this is a field in a group',
  };

  beforeEach(() => {
    mockInitialState = getInitialStateMock();
  });
  it('should fetch form data', () => {
    const appMetadata = appMetaDataSelector(mockInitialState);
    const instance = instanceDataSelector(mockInitialState);
    const layoutSets: ILayoutSets = { sets: [] };
    const taskId = getCurrentTaskDataElementId(appMetadata, instance, layoutSets) as string;
    const url = appUrlHelper.getFetchFormDataUrl(instance?.id || '', taskId);

    expectSaga(fetchFormDataSaga)
      .provide([
        [select(appMetaDataSelector), { ...mockInitialState.applicationMetadata.applicationMetadata }],
        [select(instanceDataSelector), { ...mockInitialState.instanceData.instance }],
        [call(networking.get, url), mockFormData],
      ])
      .put(FormDataActions.fetchFulfilled({ formData: flattenedFormData }))
      .run();
  });

  it('should handle error in fetchFormData', () => {
    const appMetadata = appMetaDataSelector(mockInitialState);
    const instance = instanceDataSelector(mockInitialState);
    const error: AxiosError = {
      isAxiosError: true,
      message: 'error',
      name: 'error',
      toJSON: () => {
        return {};
      },
      response: {
        config: { headers: {} as AxiosRequestHeaders },
        headers: {} as AxiosRequestHeaders,
        data: null,
        status: 500,
        statusText: 'error',
      },
    };

    jest.spyOn(networking, 'get').mockImplementation(() => {
      throw error;
    });

    expectSaga(fetchFormDataSaga)
      .provide([
        [select(appMetaDataSelector), appMetadata],
        [select(instanceDataSelector), instance],
      ])
      .put(FormDataActions.fetchRejected({ error }))
      .run();
  });

  it('should fetch form data initial', () => {
    const appMetadata = appMetaDataSelector(mockInitialState);
    const instance = instanceDataSelector(mockInitialState);
    const layoutSets: ILayoutSets = { sets: [] };
    const taskId = getCurrentTaskDataElementId(appMetadata, instance, layoutSets) as string;
    const url = appUrlHelper.getFetchFormDataUrl(instance?.id || '', taskId);

    expectSaga(fetchFormDataInitialSaga)
      .provide([
        [select(appMetaDataSelector), { ...mockInitialState.applicationMetadata.applicationMetadata }],
        [select(instanceDataSelector), { ...mockInitialState.instanceData.instance }],
        [call(networking.get, url), mockFormData],
      ])
      .put(FormDataActions.fetchFulfilled({ formData: flattenedFormData }))
      .run();
  });

  it('should handle error in fetchFormDataInitial', () => {
    const appMetadata = appMetaDataSelector(mockInitialState);
    const instance = instanceDataSelector(mockInitialState);
    const error: AxiosError = {
      isAxiosError: true,
      message: 'error',
      name: 'error',
      toJSON: () => {
        return {};
      },
      response: {
        config: { headers: {} as AxiosRequestHeaders },
        headers: {} as AxiosRequestHeaders,
        data: null,
        status: 500,
        statusText: 'error',
      },
    };

    jest.spyOn(networking, 'get').mockImplementation(() => {
      throw error;
    });

    expectSaga(fetchFormDataInitialSaga)
      .provide([
        [select(appMetaDataSelector), { ...appMetadata }],
        [select(instanceDataSelector), { ...instance }],
      ])
      .put(FormDataActions.fetchRejected({ error }))
      .put(QueueActions.dataTaskQueueError({ error }))
      .run();
  });

  it('should fetch form data initial for stateless app', () => {
    const appMetadata: IApplication = {
      ...(appMetaDataSelector(mockInitialState) as IApplicationMetadata),
      onEntry: {
        show: 'stateless',
      },
    };
    const mockLayoutSets: ILayoutSets = {
      sets: [
        {
          id: 'stateless',
          dataType: 'test-data-model',
        },
      ],
    };

    const dataType = getDataTypeByLayoutSetId('stateless', mockLayoutSets) as string;
    const url = appUrlHelper.getStatelessFormDataUrl(dataType);
    const options = {
      headers: {
        party: 'partyid:1234',
      },
    };

    expectSaga(fetchFormDataInitialSaga)
      .provide([
        [select(appMetaDataSelector), appMetadata],
        [select(layoutSetsSelector), mockLayoutSets],
        [select(makeGetAllowAnonymousSelector()), false],
        [select(currentSelectedPartyIdSelector), '1234'],
        [call(networking.get, url, options), mockFormData],
      ])
      .put(FormDataActions.fetchFulfilled({ formData: flattenedFormData }))
      .run();
  });

  it('should fetch form data initial for stateless app with allowAnonymousOnStateless', () => {
    const appMetadata: IApplication = {
      ...(appMetaDataSelector(mockInitialState) as IApplicationMetadata),
      onEntry: {
        show: 'stateless',
      },
    };

    const mockLayoutSets: ILayoutSets = {
      sets: [
        {
          id: 'stateless',
          dataType: 'test-data-model',
        },
      ],
    };

    const dataType = getDataTypeByLayoutSetId('stateless', mockLayoutSets) as string;
    const url = appUrlHelper.getStatelessFormDataUrl(dataType);
    const options = {};

    expectSaga(fetchFormDataInitialSaga)
      .provide([
        [select(appMetaDataSelector), appMetadata],
        [select(layoutSetsSelector), mockLayoutSets],
        [select(makeGetAllowAnonymousSelector()), true],
        [call(networking.get, url, options), mockFormData],
      ])
      .put(FormDataActions.fetchFulfilled({ formData: flattenedFormData }))
      .run();
  });

  it('should handle error in fetchFormDataStateless', () => {
    const appMetadata: IApplication = {
      ...(appMetaDataSelector(mockInitialState) as IApplicationMetadata),
      onEntry: {
        show: 'stateless',
      },
    };

    const mockLayoutSets: ILayoutSets = {
      sets: [
        {
          id: 'stateless',
          dataType: 'test-data-model',
        },
      ],
    };

    const error: AxiosError = {
      isAxiosError: true,
      message: 'error',
      name: 'error',
      toJSON: () => {
        return {};
      },
      response: {
        config: { headers: {} as AxiosRequestHeaders },
        headers: {} as AxiosRequestHeaders,
        data: null,
        status: 500,
        statusText: 'error',
      },
    };

    jest.spyOn(networking, 'get').mockImplementation(() => {
      throw error;
    });

    expectSaga(fetchFormDataInitialSaga)
      .provide([
        [select(appMetaDataSelector), appMetadata],
        [select(layoutSetsSelector), mockLayoutSets],
        [select(makeGetAllowAnonymousSelector()), true],
      ])
      .put(FormDataActions.fetchRejected({ error }))
      .put(QueueActions.dataTaskQueueError({ error }))
      .run();
  });

  it('should handle redirect to authentication in fetchFormDataStateless', () => {
    const appMetadata: IApplication = {
      ...(appMetaDataSelector(mockInitialState) as IApplicationMetadata),
      onEntry: {
        show: 'stateless',
      },
    };

    const mockLayoutSets: ILayoutSets = {
      sets: [
        {
          id: 'stateless',
          dataType: 'test-data-model',
        },
      ],
    };

    const error: AxiosError = {
      isAxiosError: true,
      message: 'error',
      name: 'error',
      toJSON: () => {
        return {};
      },
      response: {
        config: { headers: {} as AxiosRequestHeaders },
        headers: {} as AxiosRequestHeaders,
        data: null,
        status: 403,
        statusText: 'error',
      },
    };

    jest.spyOn(networking, 'get').mockImplementation(() => {
      throw error;
    });

    jest.spyOn(appUrlHelper, 'redirectToUpgrade').mockImplementation(() => {
      return;
    });

    expectSaga(fetchFormDataInitialSaga)
      .provide([
        [select(appMetaDataSelector), appMetadata],
        [select(layoutSetsSelector), mockLayoutSets],
        [select(makeGetAllowAnonymousSelector()), true],
      ])
      .call(appUrlHelper.redirectToUpgrade, 2)
      .run();
  });

  it('should trigger fetchFormDataInitialSaga', () => {
    const appMetadata = appMetaDataSelector(mockInitialState);
    const processState = processStateSelector(mockInitialState);
    const instance = instanceDataSelector(mockInitialState);

    expectSaga(watchFetchFormDataInitialSaga)
      .provide([
        [select(appMetaDataSelector), appMetadata],
        [select(instanceDataSelector), instance],
        [select(processStateSelector), processState],
      ])
      .take(InstanceDataActions.getFulfilled)
      .take(DataModelActions.fetchJsonSchemaFulfilled)
      .call(fetchFormDataInitialSaga)
      .run();
  });

  it('should trigger fetchFormDataInitialSaga, stateless app', () => {
    const appMetadata = appMetaDataSelector(mockInitialState);

    expectSaga(watchFetchFormDataInitialSaga)
      .provide([
        [select(appMetaDataSelector), appMetadata],
        [select(makeGetAllowAnonymousSelector()), false],
      ])
      .take(DataModelActions.fetchJsonSchemaFulfilled)
      .call(fetchFormDataInitialSaga)
      .run();
  });
});
