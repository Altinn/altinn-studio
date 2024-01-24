import React, { useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';

import deepEqual from 'fast-deep-equal';

import { ContextNotProvided, createContext } from 'src/core/contexts/context';
import { usePostUpload } from 'src/features/attachments/utils/postUpload';
import { usePreUpload } from 'src/features/attachments/utils/preUpload';
import { mergeAndSort } from 'src/features/attachments/utils/sorting';
import type {
  AttachmentActionRemove,
  AttachmentActionUpdate,
  AttachmentActionUpload,
  IAttachments,
  RawAttachmentAction,
  TemporaryAttachment,
} from 'src/features/attachments/index';
import type { IData } from 'src/types/shared';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

interface IAttachmentsMethodsCtx {
  upload(action: RawAttachmentAction<AttachmentActionUpload>): Promise<string | undefined>;
  update(action: RawAttachmentAction<AttachmentActionUpdate>): Promise<void>;
  remove(action: RawAttachmentAction<AttachmentActionRemove>): Promise<boolean>;
  awaitUpload(attachment: TemporaryAttachment): Promise<IData | false>;
}

interface IAttachmentsStoreCtx {
  attachments: IAttachments;
  setAttachments: React.Dispatch<React.SetStateAction<IAttachments>>;
}

const {
  Provider: StoreProvider,
  useCtx: useStoreCtx,
  useLaxCtx: useLaxStoreCtx,
} = createContext<IAttachmentsStoreCtx>({
  name: 'AttachmentsStore',
  required: true,
});
const { Provider: MethodsProvider, useCtx: useMethodsCtx } = createContext<IAttachmentsMethodsCtx>({
  name: 'AttachmentsMethods',
  required: true,
});

/**
 * The attachments provider is split into two parts:
 * - This AttachmentsProvider, which is responsible for generating the attachments object and providing the methods
 *   for manipulating it.
 * - The AttachmentsStoreProvider, which is responsible for storing the attachments object, and giving it to the
 *   NodesProvider. The node hierarchy needs to know about the attachments, but the cyclical dependency between
 *   AttachmentsProvider and NodesProvider makes it impossible to do this in a single provider.
 */
export const AttachmentsProvider = ({ children }: PropsWithChildren) => {
  const { setAttachments } = useStoreCtx();
  const { state: preUpload, upload, awaitUpload } = usePreUpload();
  const { state: postUpload, update, remove } = usePostUpload();

  const attachments = useMemo(() => mergeAndSort(preUpload, postUpload), [preUpload, postUpload]);

  useEffect(() => {
    setAttachments((oldAttachments) => {
      if (deepEqual(oldAttachments, attachments)) {
        return oldAttachments;
      }
      return attachments;
    });
  }, [attachments, setAttachments]);

  return (
    <MethodsProvider
      value={{
        upload,
        update,
        remove,
        awaitUpload,
      }}
    >
      {children}
    </MethodsProvider>
  );
};

export const AttachmentsStoreProvider = ({ children }: PropsWithChildren) => {
  const [attachments, setAttachments] = useState<IAttachments>({});

  useEffect(() => {
    if (window.Cypress) {
      window.CypressState = { ...window.CypressState, attachments };
    }
  }, [attachments]);

  return (
    <StoreProvider
      value={{
        attachments,
        setAttachments,
      }}
    >
      {children}
    </StoreProvider>
  );
};

export const useAttachments = () => useStoreCtx().attachments;
export const useAttachmentsUploader = () => useMethodsCtx().upload;
export const useAttachmentsUpdater = () => useMethodsCtx().update;
export const useAttachmentsRemover = () => useMethodsCtx().remove;
export const useAttachmentsAwaiter = () => useMethodsCtx().awaitUpload;
export const useAttachmentsFor = (node: LayoutNode<'FileUploadWithTag' | 'FileUpload'>) => {
  const { attachments } = useStoreCtx();
  return attachments[node.item.id] || [];
};

export const useHasPendingAttachments = () => {
  const store = useLaxStoreCtx();
  if (store === ContextNotProvided) {
    return false;
  }

  const { attachments } = store;
  return Object.values(attachments).some(
    (fileUploader) =>
      fileUploader?.some((attachment) => !attachment.uploaded || attachment.updating || attachment.deleting),
  );
};
