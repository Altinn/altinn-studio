import React, { useEffect, useMemo } from 'react';
import type { PropsWithChildren } from 'react';

import deepEqual from 'fast-deep-equal';
import { createStore } from 'zustand';

import { ContextNotProvided } from 'src/core/contexts/context';
import { createZustandContext } from 'src/core/contexts/zustandContext';
import { Loader } from 'src/core/loading/Loader';
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

interface IAttachmentsMethods {
  upload(action: RawAttachmentAction<AttachmentActionUpload>): Promise<string | undefined>;
  update(action: RawAttachmentAction<AttachmentActionUpdate>): Promise<void>;
  remove(action: RawAttachmentAction<AttachmentActionRemove>): Promise<boolean>;
  awaitUpload(attachment: TemporaryAttachment): Promise<IData | false>;
}

interface IAttachmentsStoreCtx {
  attachments: IAttachments;
  setAttachments: (newAttachments: IAttachments) => void;
  methods: Partial<IAttachmentsMethods>;
  setMethods: (newMethods: IAttachmentsMethods) => void;
}

function initialCreateStore() {
  return createStore<IAttachmentsStoreCtx>((set) => ({
    attachments: {},
    methods: {},
    setAttachments: (attachments) =>
      set((state) => {
        if (deepEqual(state.attachments, attachments)) {
          return state;
        }
        return { attachments };
      }),
    setMethods: (methods) => set({ methods }),
  }));
}

const { Provider, useSelector, useLaxMemoSelector } = createZustandContext({
  name: 'Attachments',
  required: true,
  initialCreateStore,
});

/**
 * The attachments provider is split into two parts:
 * - This AttachmentsProvider, which is responsible for generating the attachments object and providing the methods
 *   for manipulating it.
 * - The AttachmentsStoreProvider, which is responsible for storing the attachments object, and giving it to the
 *   NodesProvider. The node hierarchy needs to know about the attachments, but the cyclical dependency between
 *   AttachmentsProvider and NodesProvider makes it impossible to do this in a single provider.
 */
export const AttachmentsProvider = ({ children }: PropsWithChildren) => (
  <>
    <ProvideAttachmentsAndMethods />
    <LoadingUntilMethodsProvided>{children}</LoadingUntilMethodsProvided>
  </>
);

export const AttachmentsStoreProvider = ({ children }: PropsWithChildren) => (
  <Provider>
    {window.Cypress && <UpdateAttachmentsForCypress />}
    {children}
  </Provider>
);

function UpdateAttachmentsForCypress() {
  const attachments = useAttachments();

  useEffect(() => {
    if (window.Cypress) {
      window.CypressState = { ...window.CypressState, attachments };
    }
  }, [attachments]);

  return null;
}

function ProvideAttachmentsAndMethods() {
  const setAttachments = useSelector((store) => store.setAttachments);
  const setMethods = useSelector((store) => store.setMethods);
  const { state: preUpload, upload, awaitUpload } = usePreUpload();
  const { state: postUpload, update, remove } = usePostUpload();

  const attachments = useMemo(() => mergeAndSort(preUpload, postUpload), [preUpload, postUpload]);

  const methods = useMemo(
    () => ({
      upload,
      update,
      remove,
      awaitUpload,
    }),
    [upload, update, remove, awaitUpload],
  );

  useEffect(() => {
    setAttachments(attachments);
  }, [attachments, setAttachments]);

  useEffect(() => {
    setMethods(methods);
  }, [methods, setMethods]);

  return null;
}

function LoadingUntilMethodsProvided({ children }: PropsWithChildren) {
  const methods = useSelector((store) => store.methods);

  if (Object.keys(methods).length === 0) {
    return <Loader reason='attachments' />;
  }

  return children;
}

export const useAttachments = () => useSelector((state) => state.attachments);
export const useAttachmentsUploader = () => useSelector((state) => state.methods.upload!);
export const useAttachmentsUpdater = () => useSelector((state) => state.methods.update!);
export const useAttachmentsRemover = () => useSelector((state) => state.methods.remove!);
export const useAttachmentsAwaiter = () => useSelector((state) => state.methods.awaitUpload!);

const emptyArray = [];
export const useAttachmentsFor = (node: LayoutNode<'FileUploadWithTag' | 'FileUpload'>) =>
  useSelector((store) => store.attachments[node.item.id]) || emptyArray;

export const useHasPendingAttachments = () => {
  const out = useLaxMemoSelector((store) => {
    const { attachments } = store;
    return Object.values(attachments).some((fileUploader) =>
      fileUploader?.some((attachment) => !attachment.uploaded || attachment.updating || attachment.deleting),
    );
  });

  return out === ContextNotProvided ? false : out;
};
