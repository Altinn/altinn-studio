import { expectSaga, testSaga } from 'redux-saga-test-plan';
import { select } from 'redux-saga/effects';

import FormDataActions from 'src/features/form/data/formDataActions';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { getInitialStateMock } from '__mocks__/initialStateMock';
import * as sharedUtils from 'altinn-shared/utils';
import {
  calculatePageOrderAndMoveToNextPageSaga,
  initRepeatingGroupsSaga,
  watchInitRepeatingGroupsSaga,
} from './updateFormLayoutSagas';
import { IRuntimeState } from 'src/types';

jest.mock('altinn-shared/utils');

describe('updateLayoutSagas', () => {
  describe('watchInitRepeatingGroupsSaga', () => {
    it('should wait for layout, then wait trigger on relevant actions', () => {
      const saga = testSaga(watchInitRepeatingGroupsSaga);
      saga
        .next()
        .take(FormLayoutActions.fetchLayoutFulfilled)
        .next()
        .call(initRepeatingGroupsSaga)
        .next()
        .takeLatest(
          [
            FormDataActions.fetchFormDataFulfilled,
            FormLayoutActions.initRepeatingGroups,
            FormLayoutActions.fetchLayoutFulfilled,
          ],
          initRepeatingGroupsSaga,
        )
        .next()
        .isDone();
    });
  });

  describe('calculatePageOrderAndMoveToNextPageSaga', () => {
    const state = getInitialStateMock();
    const orderResponse = ['page-1', 'FormLayout', 'page-3'];
    (sharedUtils.post as jest.Mock).mockResolvedValue(orderResponse);

    it('should fetch pageOrder and update state accordingly', () => {
      const action = { type: 'test', payload: {} };
      return expectSaga(calculatePageOrderAndMoveToNextPageSaga, action)
        .provide([
          [select(), state],
        ])
        .put(FormLayoutActions.calculatePageOrderAndMoveToNextPageFulfilled({ order: orderResponse }))
        .put(FormLayoutActions.updateCurrentView({ newView: 'page-3', runValidations: undefined }))
        .run();
    });

    it('should not update current view if skipMoveToNext is true', () => {
      const action = { type: 'test', payload: { skipMoveToNext: true } };
      return expectSaga(calculatePageOrderAndMoveToNextPageSaga, action)
        .provide([
          [select(), state],
        ])
        .put(FormLayoutActions.calculatePageOrderAndMoveToNextPageFulfilled({ order: orderResponse }))
        .run();
    });

    it('stateless: should fetch pageOrder and update state accordingly', () => {
      const action = { type: 'test', payload: {} };
      const stateWithStatelessApp: IRuntimeState = {
        ...state,
        applicationMetadata: {
          ...state.applicationMetadata,
          applicationMetadata: {
            ...state.applicationMetadata.applicationMetadata,
            onEntry: {
              show: 'some-data-type'
            }
          },
        },
        formLayout: {
          ...state.formLayout,
          layoutsets: {
            sets: [{ id: 'some-data-type', dataType: 'some-data-type', tasks: [] }]
          }
        }
      };
      return expectSaga(calculatePageOrderAndMoveToNextPageSaga, action)
        .provide([
          [select(), stateWithStatelessApp],
        ])
        .put(FormLayoutActions.calculatePageOrderAndMoveToNextPageFulfilled({ order: orderResponse }))
        .put(FormLayoutActions.updateCurrentView({ newView: 'page-3', runValidations: undefined }))
        .run();
    });

    it('should set new page to returnToView if set in state', () => {
      const action = { type: 'test', payload: {} };
      const stateWithReturnToView: IRuntimeState = {
        ...state,
        formLayout: {
          ...state.formLayout,
          uiConfig: {
            ...state.formLayout.uiConfig,
            returnToView: 'return-here'
          }
        }
      }
      return expectSaga(calculatePageOrderAndMoveToNextPageSaga, action)
        .provide([
          [select(), stateWithReturnToView],
        ])
        .put(FormLayoutActions.calculatePageOrderAndMoveToNextPageFulfilled({ order: orderResponse }))
        .put(FormLayoutActions.updateCurrentView({ newView: 'return-here', runValidations: undefined }))
        .run();
    });

    it('should call rejected action if fetching of order fails', () => {
      const action = { type: 'test', payload: {} };
      const error = new Error('mock');
      (sharedUtils.post as jest.Mock).mockRejectedValue(error);
      return expectSaga(calculatePageOrderAndMoveToNextPageSaga, action)
        .provide([
          [select(), state],
        ])
        .put(FormLayoutActions.calculatePageOrderAndMoveToNextPageRejected({ error }))
        .run();
    });
  });
});
