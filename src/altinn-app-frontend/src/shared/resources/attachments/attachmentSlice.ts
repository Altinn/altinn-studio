import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice, createAction } from '@reduxjs/toolkit';
import type {
  IUploadAttachmentAction,
  IUploadAttachmentActionFulfilled,
  IUploadAttachmentActionRejected,
} from 'src/shared/resources/attachments/upload/uploadAttachmentActions';
import type {
  IUpdateAttachmentAction,
  IUpdateAttachmentActionFulfilled,
  IUpdateAttachmentActionRejected,
} from 'src/shared/resources/attachments/update/updateAttachmentActions';
import type {
  IDeleteAttachmentAction,
  IDeleteAttachmentActionFulfilled,
  IDeleteAttachmentActionRejected,
} from 'src/shared/resources/attachments/delete/deleteAttachmentActions';
import type {
  IMapAttachmentsActionFulfilled,
  IMapAttachmentsActionRejected,
} from 'src/shared/resources/attachments/map/mapAttachmentsActions';
import type { IAttachmentState } from 'src/shared/resources/attachments/index';

const initialState: IAttachmentState = {
  attachments: {},
  error: undefined,
};

const name = 'attachments';
const slice = createSlice({
  name,
  initialState,
  reducers: {
    uploadAttachment: (
      state,
      action: PayloadAction<IUploadAttachmentAction>,
    ) => {
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

    uploadAttachmentFulfilled: (
      state,
      action: PayloadAction<IUploadAttachmentActionFulfilled>,
    ) => {
      const { attachment, componentId, tmpAttachmentId } = action.payload;
      const index = state.attachments[componentId].findIndex(
        (item) => item.id === tmpAttachmentId,
      );
      if (index < 0) {
        return;
      }

      state.attachments[componentId][index] = attachment;
    },

    uploadAttachmentRejected: (
      state,
      action: PayloadAction<IUploadAttachmentActionRejected>,
    ) => {
      const { componentId, attachmentId } = action.payload;
      state.attachments[componentId] = state.attachments[componentId].filter(
        (attachment) => attachment.id !== attachmentId,
      );
    },

    updateAttachment: (
      state,
      action: PayloadAction<IUpdateAttachmentAction>,
    ) => {
      const { attachment, componentId } = action.payload;
      if (!state.attachments[componentId]) {
        state.attachments[componentId] = [];
      }
      const newAttachment = { ...attachment, updating: true };
      const index = state.attachments[componentId].findIndex(
        (item) => item.id === attachment.id,
      );

      state.attachments[componentId][index] = newAttachment;
    },

    updateAttachmentFulfilled: (
      state,
      action: PayloadAction<IUpdateAttachmentActionFulfilled>,
    ) => {
      const { attachment, componentId } = action.payload;
      const newAttachment = { ...attachment, updating: false };
      const index = state.attachments[componentId].findIndex(
        (item) => item.id === attachment.id,
      );
      state.attachments[componentId][index] = newAttachment;
    },

    updateAttachmentRejected: (
      state,
      action: PayloadAction<IUpdateAttachmentActionRejected>,
    ) => {
      const { attachment, componentId, tag } = action.payload;
      const newAttachment = {
        ...attachment,
        tag,
        updating: false,
      };
      const index = state.attachments[componentId].findIndex(
        (item) => item.id === attachment.id,
      );

      state.attachments[componentId][index] = newAttachment;
    },

    deleteAttachment: (
      state,
      action: PayloadAction<IDeleteAttachmentAction>,
    ) => {
      const { attachment, componentId } = action.payload;
      const index = state.attachments[componentId].findIndex(
        (element) => element.id === attachment.id,
      );
      if (index < 0) {
        return;
      }
      state.attachments[componentId][index].deleting = true;
    },

    deleteAttachmentFulfilled: (
      state,
      action: PayloadAction<IDeleteAttachmentActionFulfilled>,
    ) => {
      const { attachmentId: id, componentId } = action.payload;
      state.attachments[componentId] = state.attachments[componentId].filter(
        (attachment) => attachment.id !== id,
      );
    },

    deleteAttachmentRejected: (
      state,
      action: PayloadAction<IDeleteAttachmentActionRejected>,
    ) => {
      const { attachment, componentId } = action.payload;
      const newAttachment = { ...attachment, deleting: false };
      const index = state.attachments[componentId].findIndex(
        (element) => element.id === attachment.id,
      );
      if (index < 0) {
        return;
      }
      state.attachments[componentId][index] = newAttachment;
    },

    mapAttachmentsFulfilled: (
      state,
      action: PayloadAction<IMapAttachmentsActionFulfilled>,
    ) => {
      const { attachments } = action.payload;
      state.attachments = attachments;
    },

    mapAttachmentsRejected: (
      state,
      action: PayloadAction<IMapAttachmentsActionRejected>,
    ) => {
      state.error = action.payload.error;
    },
  },
});

export const AttachmentActions = {
  ...slice.actions,
  mapAttachments: createAction(`${name}/mapAttachments`),
};

export default slice;
