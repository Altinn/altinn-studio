/* eslint-disable import/named */
import { select } from 'redux-saga/effects';
import { expectSaga } from 'redux-saga-test-plan';
import { startInitialInfoTaskQueueSaga,
  ApplicationMetadataSelector,
  TextResourceSelector,
  InstanceDataSelector } from '../../../src/shared/resources/queue/infoTask/infoTaskQueueSaga';
import { ITextResource } from '../../../src/types';
import { applicationMetadataMock } from '../../../__mocks__/applicationMetadataMock';
import { getInstanceDataStateMock } from '../../../__mocks__/instanceDataStateMock';
import { finishDataTaskIsLoading, startDataTaskIsLoading } from '../../../src/shared/resources/isLoading/isLoadingSlice';
import { startInitialInfoTaskQueueFulfilled } from '../../../src/shared/resources/queue/queueSlice';

describe('infoTaskQueueSagas', () => {
  let textResources: ITextResource[];

  beforeAll(() => {
    textResources = [{
      id: 'text1',
      value: 'some text',
    }];
  });

  it('startInitialInfoTaskQueueSaga, text resources with no variables', () => {
    return expectSaga(startInitialInfoTaskQueueSaga)
      .provide([
        [select(ApplicationMetadataSelector), applicationMetadataMock],
        [select(TextResourceSelector), textResources],
        [select(InstanceDataSelector), getInstanceDataStateMock()],
      ])
      .put(startDataTaskIsLoading())
      .put(startInitialInfoTaskQueueFulfilled())
      .put(finishDataTaskIsLoading())
      .run();
  });
});
