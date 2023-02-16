import { AttachmentActions, attachmentSlice } from 'src/shared/resources/attachments/attachmentSlice';
import type { IAttachment, IAttachmentState } from 'src/shared/resources/attachments';

describe('attachmentReducer', () => {
  it('should set deleting to true when deleteAttachment action is received', () => {
    const state: IAttachmentState = {
      attachments: {
        someComponentId: [
          {
            id: 'someId',
            deleting: false,
            name: 'someName',
            size: 0,
            tags: [],
            uploaded: false,
            updating: false,
          },
        ],
      },
    };
    const newState = attachmentSlice.reducer(
      state,
      AttachmentActions.deleteAttachment({
        attachment: {
          id: 'someId',
          deleting: false,
        } as IAttachment,
        attachmentType: 'someType',
        componentId: 'someComponentId',
        dataModelBindings: {},
      }),
    );
    expect(newState.attachments.someComponentId[0].deleting).toBeTruthy();
  });

  it('should set deleting to false when deleteAttachmentRejected action is received', () => {
    const state: IAttachmentState = {
      attachments: {
        someComponentId: [
          {
            id: 'someId',
            deleting: true,
            name: 'someName',
            size: 0,
            tags: [],
            uploaded: false,
            updating: false,
          },
        ],
      },
    };
    const newState = attachmentSlice.reducer(
      state,
      AttachmentActions.deleteAttachmentRejected({
        attachment: {
          id: 'someId',
          deleting: true,
        } as IAttachment,
        attachmentType: 'someType',
        componentId: 'someComponentId',
      }),
    );
    expect(newState.attachments.someComponentId[0].deleting).toBeFalsy();
  });

  it('should remove the attachment when deleteAttachmentFulfilled action is received', () => {
    const state: IAttachmentState = {
      attachments: {
        someComponentId: [
          {
            id: 'someId',
            deleting: true,
            name: 'someName',
            size: 0,
            tags: [],
            uploaded: false,
            updating: false,
          },
          {
            id: 'someOtherId',
            deleting: true,
            name: 'someName',
            size: 0,
            tags: [],
            uploaded: false,
            updating: false,
          },
        ],
      },
    };
    const newState = attachmentSlice.reducer(
      state,
      AttachmentActions.deleteAttachmentFulfilled({
        attachmentId: 'someId',
        attachmentType: 'someType',
        componentId: 'someComponentId',
      }),
    );
    expect(newState.attachments.someComponentId.length).toEqual(1);
    expect(newState.attachments.someComponentId[0].id).toEqual('someOtherId');
  });
});
