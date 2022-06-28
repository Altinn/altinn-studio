import { expectSaga, testSaga } from "redux-saga-test-plan";
import { actionChannel, call, select } from "redux-saga/effects";

import FormDataActions from "src/features/form/data/formDataActions";
import { getInitialStateMock } from "__mocks__/initialStateMock";
import * as sharedUtils from "altinn-shared/utils";
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
} from "./updateFormLayoutSagas";
import { FormLayoutActions } from "../formLayoutSlice";
import type { IRuntimeState, IDataModelBindings } from "src/types";
import type { IUpdateRepeatingGroups } from "src/features/form/layout/formLayoutTypes";
import type { PayloadAction } from "@reduxjs/toolkit";
import * as AttachmentDeleteActions from "src/shared/resources/attachments/delete/deleteAttachmentActions";
import type { IAttachment } from "src/shared/resources/attachments";
import { updateValidations } from "src/features/form/validation/validationSlice";
import ConditionalRenderingActions from "src/features/form/dynamics/formDynamicsActions";

jest.mock("altinn-shared/utils");

describe("updateLayoutSagas", () => {
  describe("watchInitRepeatingGroupsSaga", () => {
    it("should wait for layout, then wait trigger on relevant actions", () => {
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
          initRepeatingGroupsSaga
        )
        .next()
        .isDone();
    });
  });

  describe("updateRepeatingGroupsSaga", () => {
    it("should remove attachment references from formData", () => {
      const state: IRuntimeState = getInitialStateMock();
      state.formLayout.layouts.FormLayout.push({
        id: "repeating-group",
        type: "Group",
        dataModelBindings: {
          group: "Group",
        },
        textResourceBindings: {},
        maxCount: 3,
        children: ["uploader"],
      });
      state.formLayout.uiConfig.repeatingGroups = {
        "repeating-group": {
          index: 0,
          editIndex: -1,
        },
      };
      const dataModelBinding: IDataModelBindings = {
        simpleBinding: "Group.attachmentRef",
      };
      state.formLayout.layouts.FormLayout.push({
        id: "uploader",
        type: "FileUpload",
        dataModelBindings: dataModelBinding,
        textResourceBindings: {},
      });

      const initialFormData = { ...state.formData.formData };
      state.formData.formData["Group[0].attachmentRef"] = "abc123";

      const attachment: IAttachment = {
        name: "attachment.pdf",
        id: "abc123",
        uploaded: true,
        deleting: false,
        size: 1234,
        tags: [],
        updating: false,
      };
      state.attachments.attachments = {
        "uploader-0": [attachment],
      };

      const action: PayloadAction<IUpdateRepeatingGroups> = {
        type: "formLayout/updateRepeatingGroups",
        payload: {
          layoutElementId: "repeating-group",
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
            call(ConditionalRenderingActions.checkIfConditionalRulesShouldRun),
            null,
          ],
        ])
        .put(
          AttachmentDeleteActions.deleteAttachment(
            attachment,
            "uploader",
            "uploader-0",
            {}
          )
        )
        .dispatch(
          AttachmentDeleteActions.deleteAttachmentFulfilled(
            attachment.id,
            "uploader",
            "uploader-0"
          )
        )
        .put(updateValidations({ validations: {} }))
        .put(
          FormLayoutActions.updateRepeatingGroupsFulfilled({
            repeatingGroups: {
              "repeating-group": {
                index: -1,
                editIndex: -1,
                deletingIndex: undefined,
              },
            },
          })
        )
        .put(
          FormDataActions.setFormDataFulfilled({ formData: initialFormData })
        )
        .put(FormDataActions.saveFormData())
        .run();
    });
  });

  describe("watchUpdateCurrentViewSaga", () => {
    it("should save unsaved changes before updating from layout", () => {
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
        newView: "test",
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
        .dispatch(FormDataActions.submitFormDataFulfilled)
        .take(fakeChannel)
        .call(updateCurrentViewSaga, mockAction)
        .run();
    });
    it("should not save unsaved changes before updating form layout when no unsaved changes", () => {
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
        newView: "test",
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
        .not.take(FormDataActions.submitFormDataFulfilled)
        .take(fakeChannel)
        .call(updateCurrentViewSaga, mockAction)
        .run();
    });
  });

  describe("calculatePageOrderAndMoveToNextPageSaga", () => {
    const state = getInitialStateMock();
    const orderResponse = ["page-1", "FormLayout", "page-3"];
    (sharedUtils.post as jest.Mock).mockResolvedValue(orderResponse);

    it("should fetch pageOrder and update state accordingly", () => {
      const action = { type: "test", payload: {} };
      return expectSaga(calculatePageOrderAndMoveToNextPageSaga, action)
        .provide([[select(), state]])
        .put(
          FormLayoutActions.calculatePageOrderAndMoveToNextPageFulfilled({
            order: orderResponse,
          })
        )
        .put(
          FormLayoutActions.updateCurrentView({
            newView: "page-3",
            runValidations: undefined,
          })
        )
        .run();
    });

    it("should not update current view if skipMoveToNext is true", () => {
      const action = { type: "test", payload: { skipMoveToNext: true } };
      return expectSaga(calculatePageOrderAndMoveToNextPageSaga, action)
        .provide([[select(), state]])
        .put(
          FormLayoutActions.calculatePageOrderAndMoveToNextPageFulfilled({
            order: orderResponse,
          })
        )
        .run();
    });

    it("stateless: should fetch pageOrder and update state accordingly", () => {
      const action = { type: "test", payload: {} };
      const stateWithStatelessApp: IRuntimeState = {
        ...state,
        applicationMetadata: {
          ...state.applicationMetadata,
          applicationMetadata: {
            ...state.applicationMetadata.applicationMetadata,
            onEntry: {
              show: "some-data-type",
            },
          },
        },
        formLayout: {
          ...state.formLayout,
          layoutsets: {
            sets: [
              { id: "some-data-type", dataType: "some-data-type", tasks: [] },
            ],
          },
        },
      };
      return expectSaga(calculatePageOrderAndMoveToNextPageSaga, action)
        .provide([[select(), stateWithStatelessApp]])
        .put(
          FormLayoutActions.calculatePageOrderAndMoveToNextPageFulfilled({
            order: orderResponse,
          })
        )
        .put(
          FormLayoutActions.updateCurrentView({
            newView: "page-3",
            runValidations: undefined,
          })
        )
        .run();
    });

    it("should set new page to returnToView if set in state", () => {
      const action = { type: "test", payload: {} };
      const stateWithReturnToView: IRuntimeState = {
        ...state,
        formLayout: {
          ...state.formLayout,
          uiConfig: {
            ...state.formLayout.uiConfig,
            returnToView: "return-here",
          },
        },
      };
      return expectSaga(calculatePageOrderAndMoveToNextPageSaga, action)
        .provide([[select(), stateWithReturnToView]])
        .put(
          FormLayoutActions.calculatePageOrderAndMoveToNextPageFulfilled({
            order: orderResponse,
          })
        )
        .put(
          FormLayoutActions.updateCurrentView({
            newView: "return-here",
            runValidations: undefined,
          })
        )
        .run();
    });

    it("should call rejected action if fetching of order fails", () => {
      const action = { type: "test", payload: {} };
      const error = new Error("mock");
      (sharedUtils.post as jest.Mock).mockRejectedValue(error);
      return expectSaga(calculatePageOrderAndMoveToNextPageSaga, action)
        .provide([[select(), state]])
        .put(
          FormLayoutActions.calculatePageOrderAndMoveToNextPageRejected({
            error,
          })
        )
        .run();
    });
  });
});
