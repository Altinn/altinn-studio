import { applicationMetadataMock } from '__mocks__/applicationMetadataMock';
import { getInstanceDataStateMock } from '__mocks__/instanceDataStateMock';
import { select } from 'redux-saga/effects';
import { expectSaga } from 'redux-saga-test-plan';

import { FormDataActions } from 'src/features/form/data/formDataSlice';
import { IsLoadingActions } from 'src/shared/resources/isLoading/isLoadingSlice';
import {
  ApplicationMetadataSelector,
  InstanceDataSelector,
  startInitialInfoTaskQueueSaga,
  TextResourceSelector,
} from 'src/shared/resources/queue/infoTask/infoTaskQueueSaga';
import { QueueActions } from 'src/shared/resources/queue/queueSlice';
import { TextResourcesActions } from 'src/shared/resources/textResources/textResourcesSlice';
import type { IApplicationMetadata } from 'src/shared/resources/applicationMetadata';
import type { ITextResource } from 'src/types';

import type { IInstance } from 'altinn-shared/types';

describe('infoTaskQueueSaga', () => {
  let textResources: ITextResource[];

  beforeAll(() => {
    textResources = [
      {
        id: 'text1',
        value: 'some text',
      },
    ];
  });

  it('startInitialInfoTaskQueueSaga, text resources with no variables', () => {
    return expectSaga(startInitialInfoTaskQueueSaga)
      .provide([
        [select(ApplicationMetadataSelector), applicationMetadataMock],
        [select(TextResourceSelector), textResources],
        [select(InstanceDataSelector), getInstanceDataStateMock().instance],
      ])
      .put(IsLoadingActions.startDataTaskIsLoading())
      .put(QueueActions.startInitialInfoTaskQueueFulfilled())
      .put(IsLoadingActions.finishDataTaskIsLoading())
      .run();
  });

  it('startInitialInfoTaskQueueSaga, text resources with variables should load form data', () => {
    const textsWithVariables = [
      ...textResources,
      {
        id: 'someTextWithVariable',
        value: '{0}',
        variables: [
          {
            dataSource: 'dataModel.testModel',
            key: 'someField',
          },
        ],
      },
    ];
    const applicationMetadata: IApplicationMetadata = {
      ...applicationMetadataMock,
      dataTypes: [
        {
          id: 'testModel',
          allowedContentTypes: '',
          maxCount: 1,
          minCount: 0,
        },
      ],
    };

    const instanceData: IInstance = getInstanceDataStateMock().instance;
    return expectSaga(startInitialInfoTaskQueueSaga)
      .provide([
        [select(ApplicationMetadataSelector), applicationMetadata],
        [select(TextResourceSelector), textsWithVariables],
        [select(InstanceDataSelector), instanceData],
      ])
      .put(IsLoadingActions.startDataTaskIsLoading())
      .put(QueueActions.startInitialInfoTaskQueueFulfilled())
      .put(FormDataActions.fetchFulfilled({ formData: {} }))
      .put(TextResourcesActions.replace())
      .put(IsLoadingActions.finishDataTaskIsLoading())
      .run();
  });
});
