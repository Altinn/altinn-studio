import { deleteAttachmentSaga } from 'src/shared/resources/attachments/delete/deleteAttachmentSagas';
import { watchMapAttachmentsSaga } from 'src/shared/resources/attachments/map/mapAttachmentsSagas';
import { updateAttachmentSaga } from 'src/shared/resources/attachments/update/updateAttachmentSagas';
import { uploadAttachmentSaga } from 'src/shared/resources/attachments/upload/uploadAttachmentSagas';
import { createSagaSlice } from 'src/shared/resources/utils/sagaSlice';
import type {
  IDeleteAttachmentAction,
  IDeleteAttachmentActionFulfilled,
  IDeleteAttachmentActionRejected,
} from 'src/shared/resources/attachments/delete/deleteAttachmentActions';
import type { IAttachmentState } from 'src/shared/resources/attachments/index';
import type {
  IMapAttachmentsActionFulfilled,
  IMapAttachmentsActionRejected,
} from 'src/shared/resources/attachments/map/mapAttachmentsActions';
import type {
  IUpdateAttachmentAction,
  IUpdateAttachmentActionFulfilled,
  IUpdateAttachmentActionRejected,
} from 'src/shared/resources/attachments/update/updateAttachmentActions';
import type {
  IUploadAttachmentAction,
  IUploadAttachmentActionFulfilled,
  IUploadAttachmentActionRejected,
} from 'src/shared/resources/attachments/upload/uploadAttachmentActions';
import type { MkActionType } from 'src/shared/resources/utils/sagaSlice';

const initialState: IAttachmentState = {
  attachments: {},
  error: undefined,
};

export const attachmentSlice = createSagaSlice((mkAction: MkActionType<IAttachmentState>) => ({
  name: 'attachments',
  initialState,
  actions: {
    uploadAttachment: mkAction<IUploadAttachmentAction>({
      takeEvery: uploadAttachmentSaga,
      reducer: (state, action) => {
        const { file, componentId, tmpAttachmentId } = action.payload;
        if (!state.attachments[componentId]) {
          state.attachments[componentId] = [];
        }

        state.attachments[componentId].push({
          name: file.name,
          size: file.size,
          uploaded: false,
          id: tmpAttachmentId,
          tags: [],
          deleting: false,
          updating: false,
        });
      },
    }),
    uploadAttachmentFulfilled: mkAction<IUploadAttachmentActionFulfilled>({
      reducer: (state, action) => {
        const { attachment, componentId, tmpAttachmentId } = action.payload;
        const index = state.attachments[componentId].findIndex((item) => item.id === tmpAttachmentId);
        if (index < 0) {
          return;
        }

        state.attachments[componentId][index] = attachment;
      },
    }),
    uploadAttachmentRejected: mkAction<IUploadAttachmentActionRejected>({
      reducer: (state, action) => {
        const { componentId, attachmentId } = action.payload;
        state.attachments[componentId] = state.attachments[componentId].filter(
          (attachment) => attachment.id !== attachmentId,
        );
      },
    }),
    updateAttachment: mkAction<IUpdateAttachmentAction>({
      takeEvery: updateAttachmentSaga,
      reducer: (state, action) => {
        const { attachment, componentId } = action.payload;
        if (!state.attachments[componentId]) {
          state.attachments[componentId] = [];
        }
        const newAttachment = { ...attachment, updating: true };
        const index = state.attachments[componentId].findIndex((item) => item.id === attachment.id);

        state.attachments[componentId][index] = newAttachment;
      },
    }),
    updateAttachmentFulfilled: mkAction<IUpdateAttachmentActionFulfilled>({
      reducer: (state, action) => {
        const { attachment, componentId } = action.payload;
        const newAttachment = { ...attachment, updating: false };
        const index = state.attachments[componentId].findIndex((item) => item.id === attachment.id);
        state.attachments[componentId][index] = newAttachment;
      },
    }),
    updateAttachmentRejected: mkAction<IUpdateAttachmentActionRejected>({
      reducer: (state, action) => {
        const { attachment, componentId, tag } = action.payload;
        const newAttachment = {
          ...attachment,
          tag,
          updating: false,
        };
        const index = state.attachments[componentId].findIndex((item) => item.id === attachment.id);

        state.attachments[componentId][index] = newAttachment;
      },
    }),
    deleteAttachment: mkAction<IDeleteAttachmentAction>({
      takeEvery: deleteAttachmentSaga,
      reducer: (state, action) => {
        const { attachment, componentId } = action.payload;
        const index = state.attachments[componentId].findIndex((element) => element.id === attachment.id);
        if (index < 0) {
          return;
        }
        state.attachments[componentId][index].deleting = true;
      },
    }),
    deleteAttachmentFulfilled: mkAction<IDeleteAttachmentActionFulfilled>({
      reducer: (state, action) => {
        const { attachmentId: id, componentId } = action.payload;
        state.attachments[componentId] = state.attachments[componentId].filter((attachment) => attachment.id !== id);
      },
    }),
    deleteAttachmentRejected: mkAction<IDeleteAttachmentActionRejected>({
      reducer: (state, action) => {
        const { attachment, componentId } = action.payload;
        const newAttachment = { ...attachment, deleting: false };
        const index = state.attachments[componentId].findIndex((element) => element.id === attachment.id);
        if (index < 0) {
          return;
        }
        state.attachments[componentId][index] = newAttachment;
      },
    }),
    mapAttachments: mkAction<void>({
      saga: () => watchMapAttachmentsSaga,
    }),
    mapAttachmentsFulfilled: mkAction<IMapAttachmentsActionFulfilled>({
      reducer: (state, action) => {
        const { attachments } = action.payload;
        state.attachments = attachments;
      },
    }),
    mapAttachmentsRejected: mkAction<IMapAttachmentsActionRejected>({
      reducer: (state, action) => {
        state.error = action.payload.error;
      },
    }),
  },
}));

export const AttachmentActions = attachmentSlice.actions;
