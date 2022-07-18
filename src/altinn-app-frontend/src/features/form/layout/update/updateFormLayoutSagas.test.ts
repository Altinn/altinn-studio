import { expectSaga, testSaga } from 'redux-saga-test-plan';
import { actionChannel, call, select, take } from 'redux-saga/effects';

import { FormDataActions } from 'src/features/form/data/formDataSlice';
import { getInitialStateMock } from '__mocks__/initialStateMock';
import * as sharedUtils from 'altinn-shared/utils';
import {
  calculatePageOrderAndMoveToNextPageSaga,
  initRepeatingGroupsSaga,
  watchInitRepeatingGroupsSaga,
  watchUpdateCurrentViewSaga,
  updateCurrentViewSaga,
  selectUnsavedChanges,
  updateRepeatingGroupsSaga,
  selectFormLayoutState,
  selectFormData,
  selectAttachmentState,
  selectValidations,
} from './updateFormLayoutSagas';
import { FormLayoutActions } from '../formLayoutSlice';
import type { IRuntimeState, IDataModelBindings } from 'src/types';
import type { IUpdateRepeatingGroups } from 'src/features/form/layout/formLayoutTypes';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { IAttachment } from 'src/shared/resources/attachments';
import { ValidationActions } from 'src/features/form/validation/validationSlice';
import { FormDynamicsActions } from 'src/features/form/dynamics/formDynamicsSlice';
import { AttachmentActions } from 'src/shared/resources/attachments/attachmentSlice';
import type { ILayoutCompFileUpload } from 'src/features/form/layout';

jest.mock('altinn-shared/utils');

describe('updateLayoutSagas', () => {
  describe('watchInitRepeatingGroupsSaga', () => {
    it('should wait for layout, then wait trigger on relevant actions', () => {
      const saga = testSaga(watchInitRepeatingGroupsSaga);
      saga
        .next()
        .take(FormLayoutActions.fetchFulfilled)
        .next()
        .call(initRepeatingGroupsSaga)
        .next()
        .takeLatest(
          [
            FormDataActions.fetchFulfilled,
            FormLayoutActions.initRepeatingGroups,
            FormLayoutActions.fetchFulfilled,
          ],
          initRepeatingGroupsSaga,
        )
        .next()
        .isDone();
    });
  });

  describe('updateRepeatingGroupsSaga', () => {
    it('should remove attachment references from formData', () => {
      const state: IRuntimeState = getInitialStateMock();
      state.formLayout.layouts.FormLayout.push({
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
        },
      };
      const dataModelBinding: IDataModelBindings = {
        simpleBinding: 'Group.attachmentRef',
      };
      state.formLayout.layouts.FormLayout.push({
        id: 'uploader',
        type: 'FileUpload',
        dataModelBindings: dataModelBinding,
        textResourceBindings: {},
      } as ILayoutCompFileUpload);

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
        .put(
          FormLayoutActions.updateRepeatingGroupsFulfilled({
            repeatingGroups: {
              'repeating-group': {
                index: -1,
                editIndex: -1,
                deletingIndex: undefined,
              },
            },
          }),
        )
        .put(FormDataActions.setFulfilled({ formData: initialFormData }))
        .put(FormDataActions.save())
        .run();
    });
  });

  describe('watchUpdateCurrentViewSaga', () => {
    it('should save unsaved changes before updating from layout', () => {
      const fakeChannel = {
        take() {
          /* Intentionally empty */
        },
        flush() {
          /* Intentionally empty */
        },
        close() {
          /* Intentionally empty */
        },
      };

      const mockAction = FormLayoutActions.updateCurrentView({
        newView: 'test',
      });

      const mockSaga = function* () {
        /* intentially empty */
      };

      return expectSaga(watchUpdateCurrentViewSaga)
        .provide([
          [actionChannel(FormLayoutActions.updateCurrentView), fakeChannel],
          [select(selectUnsavedChanges), true],
          {
            take({ channel }, next) {
              if (channel === fakeChannel) {
                return mockAction;
              }
              return next();
            },
          },
          [call(updateCurrentViewSaga, mockAction), mockSaga],
        ])
        .dispatch(FormLayoutActions.updateCurrentView)
        .dispatch(FormDataActions.submitFulfilled)
        .take(fakeChannel)
        .call(updateCurrentViewSaga, mockAction)
        .run();
    });
    it('should not save unsaved changes before updating form layout when no unsaved changes', () => {
      const fakeChannel = {
        take() {
          /* Intentionally empty */
        },
        flush() {
          /* Intentionally empty */
        },
        close() {
          /* Intentionally empty */
        },
      };

      const mockAction = FormLayoutActions.updateCurrentView({
        newView: 'test',
      });

      const mockSaga = function* () {
        /* intentially empty */
      };

      return expectSaga(watchUpdateCurrentViewSaga)
        .provide([
          [actionChannel(FormLayoutActions.updateCurrentView), fakeChannel],
          [select(selectUnsavedChanges), false],
          {
            take({ channel }, next) {
              if (channel === fakeChannel) {
                return mockAction;
              }
              return next();
            },
          },
          [call(updateCurrentViewSaga, mockAction), mockSaga],
        ])
        .dispatch(FormLayoutActions.updateCurrentView)
        .not.take(FormDataActions.submitFulfilled)
        .take(fakeChannel)
        .call(updateCurrentViewSaga, mockAction)
        .run();
    });
  });

  describe('calculatePageOrderAndMoveToNextPageSaga', () => {
    const state = getInitialStateMock();
    const orderResponse = ['page-1', 'FormLayout', 'page-3'];
    (sharedUtils.post as jest.Mock).mockResolvedValue(orderResponse);

    it('should fetch pageOrder and update state accordingly', () => {
      const action = { type: 'test', payload: {} };
      return expectSaga(calculatePageOrderAndMoveToNextPageSaga, action)
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
          }),
        )
        .run();
    });

    it('should not update current view if skipMoveToNext is true', () => {
      const action = { type: 'test', payload: { skipMoveToNext: true } };
      return expectSaga(calculatePageOrderAndMoveToNextPageSaga, action)
        .provide([[select(), state]])
        .put(
          FormLayoutActions.calculatePageOrderAndMoveToNextPageFulfilled({
            order: orderResponse,
          }),
        )
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
              show: 'some-data-type',
            },
          },
        },
        formLayout: {
          ...state.formLayout,
          layoutsets: {
            sets: [
              { id: 'some-data-type', dataType: 'some-data-type', tasks: [] },
            ],
          },
        },
      };
      return expectSaga(calculatePageOrderAndMoveToNextPageSaga, action)
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
          }),
        )
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
            returnToView: 'return-here',
          },
        },
      };
      return expectSaga(calculatePageOrderAndMoveToNextPageSaga, action)
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
          }),
        )
        .run();
    });

    it('should call rejected action if fetching of order fails', () => {
      const action = { type: 'test', payload: {} };
      const error = new Error('mock');
      (sharedUtils.post as jest.Mock).mockRejectedValue(error);
      return expectSaga(calculatePageOrderAndMoveToNextPageSaga, action)
        .provide([[select(), state]])
        .put(
          FormLayoutActions.calculatePageOrderAndMoveToNextPageRejected({
            error,
          }),
        )
        .run();
    });
  });
});
