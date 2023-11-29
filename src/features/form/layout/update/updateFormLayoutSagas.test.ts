import mockAxios from 'jest-mock-axios';
import { select } from 'redux-saga/effects';
import { expectSaga } from 'redux-saga-test-plan';
import type { PayloadAction } from '@reduxjs/toolkit';

import { getFormLayoutStateMock } from 'src/__mocks__/getFormLayoutStateMock';
import { getUiConfigStateMock } from 'src/__mocks__/getUiConfigStateMock';
import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import {
  findAndMoveToNextVisibleLayout,
  moveToNextPageSaga,
  selectAllLayouts,
  selectCurrentLayout,
} from 'src/features/form/layout/update/updateFormLayoutSagas';
import { selectLayoutOrder } from 'src/selectors/getLayoutOrder';
import type { IApplicationMetadata } from 'src/features/applicationMetadata';
import type { IMoveToNextPage } from 'src/features/form/layout/formLayoutTypes';
import type { IRuntimeState } from 'src/types';

describe('updateLayoutSagas', () => {
  beforeEach(() => {
    mockAxios.reset();
  });

  describe('moveToNextPageSaga', () => {
    const state = getInitialStateMock({
      formLayout: getFormLayoutStateMock({
        uiConfig: getUiConfigStateMock({
          currentView: 'FormLayout',
          returnToView: undefined,
          pageOrderConfig: {
            order: ['page-1', 'FormLayout', 'page-3'],
            hidden: [],
            hiddenExpr: {},
          },
        }),
      }),
    });

    it('should fetch pageOrder and update state accordingly', () => {
      const action: PayloadAction<IMoveToNextPage> = {
        type: 'test',
        payload: {},
      };
      return expectSaga(moveToNextPageSaga, action)
        .provide([[select(), state]])
        .put(
          FormLayoutActions.updateCurrentView({
            newView: 'page-3',
            runValidations: undefined,
            keepScrollPos: undefined,
          }),
        )
        .run();
    });

    it('stateless: should fetch pageOrder and update state accordingly', () => {
      const action: PayloadAction<IMoveToNextPage> = {
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
      return expectSaga(moveToNextPageSaga, action)
        .provide([[select(), stateWithStatelessApp]])
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
    });

    it('should set new page to returnToView if set in state', () => {
      const action: PayloadAction<IMoveToNextPage> = {
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
      return expectSaga(moveToNextPageSaga, action)
        .provide([[select(), stateWithReturnToView]])
        .put(
          FormLayoutActions.updateCurrentView({
            newView: 'return-here',
            runValidations: undefined,
            keepScrollPos: undefined,
          }),
        )
        .run();
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
