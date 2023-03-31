import mockAxios from 'jest-mock-axios';
import { select, take } from 'redux-saga/effects';
import { expectSaga } from 'redux-saga-test-plan';
import type { PayloadAction } from '@reduxjs/toolkit';

import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { AttachmentActions } from 'src/features/attachments/attachmentSlice';
import { FormDynamicsActions } from 'src/features/dynamics/formDynamicsSlice';
import { FormDataActions } from 'src/features/formData/formDataSlice';
import { FormLayoutActions } from 'src/features/layout/formLayoutSlice';
import {
  calculatePageOrderAndMoveToNextPageSaga,
  findAndMoveToNextVisibleLayout,
  selectAllLayouts,
  selectAttachmentState,
  selectCurrentLayout,
  selectFormData,
  selectFormLayoutState,
  selectOptions,
  selectValidations,
  updateRepeatingGroupsSaga,
} from 'src/features/layout/update/updateFormLayoutSagas';
import { OptionsActions } from 'src/features/options/optionsSlice';
import { ValidationActions } from 'src/features/validation/validationSlice';
import { selectLayoutOrder } from 'src/selectors/getLayoutOrder';
import type { IApplicationMetadata } from 'src/features/applicationMetadata';
import type { IAttachment } from 'src/features/attachments';
import type { ICalculatePageOrderAndMoveToNextPage, IUpdateRepeatingGroups } from 'src/features/layout/formLayoutTypes';
import type { IDataModelBindings } from 'src/layout/layout';
import type { IRuntimeState } from 'src/types';

describe('updateLayoutSagas', () => {
  beforeEach(() => {
    mockAxios.reset();
  });

  describe('updateRepeatingGroupsSaga', () => {
    it('should remove attachment references from formData', () => {
      const state: IRuntimeState = getInitialStateMock();
      state.formLayout.layouts?.FormLayout?.push({
        id: 'repeating-group',
        type: 'Group',
        dataModelBindings: {
          group: 'Group',
        },
        textResourceBindings: {},
        maxCount: 3,
        children: ['uploader'],
      });
      state.formLayout.uiConfig.repeatingGroups = {
        'repeating-group': {
          index: 0,
          editIndex: -1,
          dataModelBinding: 'Group',
        },
      };
      const dataModelBinding: IDataModelBindings = {
        simpleBinding: 'Group.attachmentRef',
      };
      state.formLayout.layouts?.FormLayout?.push({
        id: 'uploader',
        type: 'FileUpload',
        dataModelBindings: dataModelBinding,
        textResourceBindings: {},
        minNumberOfAttachments: 1,
        maxNumberOfAttachments: 15,
        maxFileSizeInMB: 15,
        displayMode: 'simple',
      });

      const initialFormData = { ...state.formData.formData };
      state.formData.formData['Group[0].attachmentRef'] = 'abc123';

      const attachment: IAttachment = {
        name: 'attachment.pdf',
        id: 'abc123',
        uploaded: true,
        deleting: false,
        size: 1234,
        tags: [],
        updating: false,
      };
      state.attachments.attachments = {
        'uploader-0': [attachment],
      };

      const action: PayloadAction<IUpdateRepeatingGroups> = {
        type: FormLayoutActions.updateRepeatingGroups.type,
        payload: {
          layoutElementId: 'repeating-group',
          index: 0,
          remove: true,
        },
      };

      return expectSaga(updateRepeatingGroupsSaga, action)
        .provide([
          [select(selectFormLayoutState), selectFormLayoutState(state)],
          [select(selectFormData), selectFormData(state)],
          [select(selectAttachmentState), selectAttachmentState(state)],
          [select(selectValidations), selectValidations(state)],
          [select(selectOptions), selectOptions(state)],
          [
            take(AttachmentActions.deleteAttachmentFulfilled),
            AttachmentActions.deleteAttachmentFulfilled({
              componentId: 'uploader-0',
              attachmentType: 'uploader',
              attachmentId: 'abc123',
            }),
          ],
        ])
        .put(FormDynamicsActions.checkIfConditionalRulesShouldRun({}))
        .put(
          AttachmentActions.deleteAttachment({
            attachment,
            attachmentType: 'uploader',
            componentId: 'uploader-0',
            dataModelBindings: {},
          }),
        )
        .put(ValidationActions.updateValidations({ validations: {} }))
        .put(OptionsActions.setOptions({ options: {} }))
        .put(
          FormLayoutActions.updateRepeatingGroupsFulfilled({
            repeatingGroups: {
              'repeating-group': {
                index: -1,
                editIndex: -1,
                deletingIndex: undefined,
                dataModelBinding: 'Group',
              },
            },
          }),
        )
        .put(FormDataActions.setFulfilled({ formData: initialFormData }))
        .put(FormDataActions.save({}))
        .run();
    });
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
