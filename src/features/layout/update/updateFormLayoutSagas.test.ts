import mockAxios from 'jest-mock-axios';
import { select } from 'redux-saga/effects';
import { expectSaga } from 'redux-saga-test-plan';
import type { PayloadAction } from '@reduxjs/toolkit';

import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { FormLayoutActions } from 'src/features/layout/formLayoutSlice';
import {
  calculatePageOrderAndMoveToNextPageSaga,
  findAndMoveToNextVisibleLayout,
  selectAllLayouts,
  selectCurrentLayout,
} from 'src/features/layout/update/updateFormLayoutSagas';
import { selectLayoutOrder } from 'src/selectors/getLayoutOrder';
import type { IApplicationMetadata } from 'src/features/applicationMetadata';
import type { ICalculatePageOrderAndMoveToNextPage } from 'src/features/layout/formLayoutTypes';
import type { IRuntimeState } from 'src/types';

describe('updateLayoutSagas', () => {
  beforeEach(() => {
    mockAxios.reset();
  });

  describe('calculatePageOrderAndMoveToNextPageSaga', () => {
    const state = getInitialStateMock();
    const orderResponse = ['page-1', 'FormLayout', 'page-3'];

    it('should fetch pageOrder and update state accordingly', () => {
      const action: PayloadAction<ICalculatePageOrderAndMoveToNextPage> = {
        type: 'test',
        payload: {},
      };
      const exp = expectSaga(calculatePageOrderAndMoveToNextPageSaga, action)
        .provide([[select(), state]])
        .put(
          FormLayoutActions.calculatePageOrderAndMoveToNextPageFulfilled({
            order: orderResponse,
          }),
        )
        .put(
          FormLayoutActions.updateCurrentView({
            newView: 'page-3',
            runValidations: undefined,
            keepScrollPos: undefined,
          }),
        )
        .run();

      mockAxios.mockResponse({ data: orderResponse });

      return exp;
    });

    it('should not update current view if skipMoveToNext is true', () => {
      const action: PayloadAction<ICalculatePageOrderAndMoveToNextPage> = {
        type: 'test',
        payload: {
          skipMoveToNext: true,
        },
      };
      const exp = expectSaga(calculatePageOrderAndMoveToNextPageSaga, action)
        .provide([[select(), state]])
        .put(
          FormLayoutActions.calculatePageOrderAndMoveToNextPageFulfilled({
            order: orderResponse,
          }),
        )
        .run();

      mockAxios.mockResponse({ data: orderResponse });

      return exp;
    });

    it('stateless: should fetch pageOrder and update state accordingly', () => {
      const action: PayloadAction<ICalculatePageOrderAndMoveToNextPage> = {
        type: 'test',
        payload: {
          keepScrollPos: {
            componentId: 'someComponent',
            offsetTop: 123,
          },
        },
      };
      const stateWithStatelessApp: IRuntimeState = {
        ...state,
        applicationMetadata: {
          ...state.applicationMetadata,
          applicationMetadata: {
            ...(state.applicationMetadata.applicationMetadata as IApplicationMetadata),
            onEntry: {
              show: 'some-data-type',
            },
          },
        },
        formLayout: {
          ...state.formLayout,
          layoutsets: {
            sets: [{ id: 'some-data-type', dataType: 'some-data-type', tasks: [] }],
          },
        },
      };
      const exp = expectSaga(calculatePageOrderAndMoveToNextPageSaga, action)
        .provide([[select(), stateWithStatelessApp]])
        .put(
          FormLayoutActions.calculatePageOrderAndMoveToNextPageFulfilled({
            order: orderResponse,
          }),
        )
        .put(
          FormLayoutActions.updateCurrentView({
            newView: 'page-3',
            runValidations: undefined,
            keepScrollPos: {
              componentId: 'someComponent',
              offsetTop: 123,
            },
          }),
        )
        .run();

      mockAxios.mockResponse({ data: orderResponse });

      return exp;
    });

    it('should set new page to returnToView if set in state', () => {
      const action: PayloadAction<ICalculatePageOrderAndMoveToNextPage> = {
        type: 'test',
        payload: {},
      };
      const stateWithReturnToView: IRuntimeState = {
        ...state,
        formLayout: {
          ...state.formLayout,
          uiConfig: {
            ...state.formLayout.uiConfig,
            returnToView: 'return-here',
          },
        },
      };
      const exp = expectSaga(calculatePageOrderAndMoveToNextPageSaga, action)
        .provide([[select(), stateWithReturnToView]])
        .put(
          FormLayoutActions.calculatePageOrderAndMoveToNextPageFulfilled({
            order: orderResponse,
          }),
        )
        .put(
          FormLayoutActions.updateCurrentView({
            newView: 'return-here',
            runValidations: undefined,
            keepScrollPos: undefined,
          }),
        )
        .run();
      mockAxios.mockResponse({ data: orderResponse });

      return exp;
    });

    it('should call rejected action if fetching of order fails', () => {
      const action = { type: 'test', payload: {} };
      const error = new Error('mock');

      const exp = expectSaga(calculatePageOrderAndMoveToNextPageSaga, action)
        .provide([[select(), state]])
        .put(
          FormLayoutActions.calculatePageOrderAndMoveToNextPageRejected({
            error,
          }),
        )
        .run();

      mockAxios.mockError(error);

      return exp;
    });
  });

  describe('findAndMoveToNextVisibleLayout', () => {
    const allLayouts = ['a', 'b', 'c', 'd'];
    it.each([
      {
        name: 'should do nothing if current page is visible',
        current: 'b',
        visible: allLayouts,
        expected: undefined,
      },
      {
        name: 'should move to c if b is not visible',
        current: 'b',
        visible: ['a', 'c', 'd'],
        expected: 'c',
      },
      {
        name: 'should move to d if b,c is not visible',
        current: 'b',
        visible: ['a', 'd'],
        expected: 'd',
      },
      {
        name: 'should move to a if c,d is not visible',
        current: 'c',
        visible: ['a', 'b'],
        expected: 'a',
      },
      {
        name: 'should do nothing if visible state is broken',
        current: 'a',
        visible: ['whatever'],
        expected: undefined,
      },
    ])('$name', ({ current, visible, expected }) => {
      const ret = expectSaga(findAndMoveToNextVisibleLayout).provide([
        [select(selectAllLayouts), allLayouts],
        [select(selectLayoutOrder), visible],
        [select(selectCurrentLayout), current],
      ]);

      if (expected) {
        ret.put(
          FormLayoutActions.updateCurrentViewFulfilled({
            newView: expected,
          }),
        );
      }

      return ret.run();
    });
  });
});
