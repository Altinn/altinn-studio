import { select } from 'redux-saga/effects';
import { expectSaga } from 'redux-saga-test-plan';

import { applicationMetadataMock } from '../../../../../__mocks__/applicationMetadataMock';
import { getInstanceDataStateMock } from '../../../../../__mocks__/instanceDataStateMock';

import type { ITextResource } from 'src/types';
import type { IInstance } from '../../../../../../shared/src/types';
import type { IApplicationMetadata } from '../../applicationMetadata';

import {
  finishDataTaskIsLoading,
  startDataTaskIsLoading,
} from '../../isLoading/isLoadingSlice';
import { startInitialInfoTaskQueueFulfilled } from '../queueSlice';
import FormDataActions from '../../../../features/form/data/formDataActions';
import TextResourcesActions from '../../textResources/textResourcesActions';
import {
  startInitialInfoTaskQueueSaga,
  ApplicationMetadataSelector,
  TextResourceSelector,
  InstanceDataSelector,
} from './infoTaskQueueSaga';

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
      .put(startDataTaskIsLoading())
      .put(startInitialInfoTaskQueueFulfilled())
      .put(finishDataTaskIsLoading())
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
      .put(startDataTaskIsLoading())
      .put(startInitialInfoTaskQueueFulfilled())
      .put(FormDataActions.fetchFormDataFulfilled({ formData: {} }))
      .call(TextResourcesActions.replaceTextResources)
      .put(finishDataTaskIsLoading())
      .run();
  });
});
