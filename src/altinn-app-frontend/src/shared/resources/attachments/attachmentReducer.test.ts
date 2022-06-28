import attachmentReducer from "./attachmentReducer";
import type { IAttachmentState } from "./attachmentReducer";
import {
  DELETE_ATTACHMENT,
  DELETE_ATTACHMENT_FULFILLED,
  DELETE_ATTACHMENT_REJECTED,
} from "./attachmentActionTypes";
import type {
  IDeleteAttachmentAction,
  IDeleteAttachmentActionFulfilled,
  IDeleteAttachmentActionRejected,
} from "./delete/deleteAttachmentActions";
import type { IAttachment } from ".";

describe("attachmentReducer", () => {
  it("should set deleting to true when DELETE_ATTACHMENT action is received", () => {
    const state: IAttachmentState = {
      attachments: {
        someComponentId: [
          {
            id: "someId",
            deleting: false,
            name: "someName",
            size: 0,
            tags: [],
            uploaded: false,
            updating: false,
          },
        ],
      },
    };
    const action: IDeleteAttachmentAction = {
      type: DELETE_ATTACHMENT,
      attachment: {
        id: "someId",
        deleting: false,
      } as IAttachment,
      attachmentType: "someType",
      componentId: "someComponentId",
      dataModelBindings: {},
    };
    const newState = attachmentReducer(state, action);
    expect(newState.attachments.someComponentId[0].deleting).toBeTruthy();
  });

  it("should set deleting to false when DELETE_ATTACHMENT_REJECTED action is received", () => {
    const state: IAttachmentState = {
      attachments: {
        someComponentId: [
          {
            id: "someId",
            deleting: true,
            name: "someName",
            size: 0,
            tags: [],
            uploaded: false,
            updating: false,
          },
        ],
      },
    };
    const action: IDeleteAttachmentActionRejected = {
      type: DELETE_ATTACHMENT_REJECTED,
      attachment: {
        id: "someId",
        deleting: true,
      } as IAttachment,
      attachmentType: "someType",
      componentId: "someComponentId",
    };
    const newState = attachmentReducer(state, action);
    expect(newState.attachments.someComponentId[0].deleting).toBeFalsy();
  });

  it("should remove the attachment when DELETE_ATTACHMENT_FULFILLED action is received", () => {
    const state: IAttachmentState = {
      attachments: {
        someComponentId: [
          {
            id: "someId",
            deleting: true,
            name: "someName",
            size: 0,
            tags: [],
            uploaded: false,
            updating: false,
          },
          {
            id: "someOtherId",
            deleting: true,
            name: "someName",
            size: 0,
            tags: [],
            uploaded: false,
            updating: false,
          },
        ],
      },
    };
    const action: IDeleteAttachmentActionFulfilled = {
      type: DELETE_ATTACHMENT_FULFILLED,
      attachmentId: "someId",
      attachmentType: "someType",
      componentId: "someComponentId",
    };
    const newState = attachmentReducer(state, action);
    expect(newState.attachments.someComponentId.length).toEqual(1);
    expect(newState.attachments.someComponentId[0].id).toEqual("someOtherId");
  });
});
