import { select } from 'redux-saga/effects';
import { expectSaga } from 'redux-saga-test-plan';

import { applicationMetadataMock } from 'src/__mocks__/applicationMetadataMock';
import { getInstanceDataStateMock } from 'src/__mocks__/instanceDataStateMock';
import { FormDataActions } from 'src/features/formData/formDataSlice';
import { IsLoadingActions } from 'src/features/isLoading/isLoadingSlice';
import {
  ApplicationMetadataSelector,
  InstanceDataSelector,
  startInitialInfoTaskQueueSaga,
  TextResourceSelector,
} from 'src/features/queue/infoTask/infoTaskQueueSaga';
import { QueueActions } from 'src/features/queue/queueSlice';
import { TextResourcesActions } from 'src/features/textResources/textResourcesSlice';
import type { IApplicationMetadata } from 'src/features/applicationMetadata';
import type { ITextResource } from 'src/types';

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

  it('startInitialInfoTaskQueueSaga, text resources with no variables', () =>
    expectSaga(startInitialInfoTaskQueueSaga)
      .provide([
        [select(ApplicationMetadataSelector), applicationMetadataMock],
        [select(TextResourceSelector), textResources],
        [select(InstanceDataSelector), getInstanceDataStateMock().instance],
      ])
      .put(IsLoadingActions.startDataTaskIsLoading())
      .put(QueueActions.startInitialInfoTaskQueueFulfilled())
      .put(IsLoadingActions.finishDataTaskIsLoading())
      .run());

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
          allowedContentTypes: [''],
          maxCount: 1,
          minCount: 0,
        },
      ],
    };

    const instanceData = getInstanceDataStateMock().instance;
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
