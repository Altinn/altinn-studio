import { useEffect, useMemo, useRef, useState } from 'react';

import deepEqual from 'fast-deep-equal';

import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { useAttachments } from 'src/features/attachments/AttachmentsContext';
import { useCustomValidationConfig } from 'src/features/customValidation/CustomValidationContext';
import { useCurrentDataModelSchema } from 'src/features/datamodel/DataModelSchemaProvider';
import { useLayoutSets } from 'src/features/form/layoutSets/LayoutSetsProvider';
import { FD } from 'src/features/formData/FormDataWrite';
import { useLaxInstanceData } from 'src/features/instance/InstanceContext';
import { useLaxProcessData } from 'src/features/instance/ProcessContext';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useEffectEvent } from 'src/hooks/useEffectEvent';
import { useNodes } from 'src/utils/layout/NodesContext';
import type { IAttachment, IAttachments, UploadedAttachment } from 'src/features/attachments';
import type { AttachmentChange, ValidationDataSources } from 'src/features/validation';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

/**
 * Hook providing validation context generator
 */
export function useValidationDataSources(): ValidationDataSources {
  const formData = FD.useDebounced();
  const attachments = useAttachments();
  const currentLanguage = useCurrentLanguage();
  const application = useApplicationMetadata();
  const instance = useLaxInstanceData() ?? null;
  const process = useLaxProcessData() ?? null;
  const layoutSets = useLayoutSets();
  const schema = useCurrentDataModelSchema()!;
  const customValidation = useCustomValidationConfig();

  return useMemo(
    () => ({
      formData,
      attachments,
      currentLanguage,
      application,
      instance,
      process,
      layoutSets,
      schema,
      customValidation,
    }),
    [application, attachments, currentLanguage, customValidation, formData, instance, layoutSets, process, schema],
  );
}

/**
 * Provides a callback function with added/removed nodes when the hierarchy changes
 */
export function useOnHierarchyChange(
  onChange: (addedNodes: LayoutNode[], removedNodes: LayoutNode[], currentNodes: LayoutNode[]) => void,
) {
  const onChangeEvent = useEffectEvent(onChange);
  const layoutNodes = useNodes();
  const lastNodes = useRef<LayoutNode[]>([]);

  useEffect(() => {
    const prevNodes = lastNodes.current;
    const newNodes = layoutNodes?.allNodes() ?? [];
    if (
      !deepEqual(
        prevNodes.map((n) => n.item.id),
        newNodes.map((n) => n.item.id),
      )
    ) {
      lastNodes.current = newNodes;

      const addedNodes = newNodes.filter((n) => !prevNodes.find((pn) => pn.item.id === n.item.id));
      const removedNodes = prevNodes.filter((pn) => !newNodes.find((n) => pn.item.id === n.item.id));
      onChangeEvent(addedNodes, removedNodes, newNodes);
    }
  }, [layoutNodes, onChangeEvent]);
}

/**
 * Provides a callback function with a list of nodes whoes data has changed
 */
export function useOnNodeDataChange(onChange: (changedNodes: LayoutNode[]) => void) {
  const onChangeEvent = useEffectEvent(onChange);
  const layoutNodes = useNodes();
  const lastNodeData = useRef<{ [id: string]: LayoutNode }>({});

  useEffect(() => {
    const prevNodes = lastNodeData.current;
    const newNodes: { [id: string]: LayoutNode } =
      layoutNodes?.allNodes().reduce((data, node) => ({ ...data, [node.item.id]: node }), {}) ?? {};

    // Update if nodes have been added or removed
    let shouldUpdate = !deepEqual(Object.keys(newNodes), Object.keys(prevNodes));

    const changedNodes: LayoutNode[] = [];
    for (const [id, newNode] of Object.entries(newNodes)) {
      const prevNode = prevNodes[id];
      if (!prevNode) {
        continue;
      }
      if (
        !deepEqual(newNode.getFormData(), prevNode.getFormData()) ||
        // Textresources are used in validation messages, and these can be defined with expressions, so textresource keys can change
        !deepEqual(newNode.item.textResourceBindings, prevNode.item.textResourceBindings)
      ) {
        shouldUpdate = true;
        changedNodes.push(newNode);
      }
    }
    if (shouldUpdate) {
      lastNodeData.current = newNodes;
    }
    if (changedNodes.length) {
      onChangeEvent(changedNodes);
    }
  }, [layoutNodes, onChangeEvent]);
}

export function useOnAttachmentsChange(
  onChange: (
    changedNodes: LayoutNode[],
    addedAttachments: AttachmentChange[],
    removedAttachments: AttachmentChange[],
  ) => void,
) {
  const onChangeEvent = useEffectEvent(onChange);
  const layoutNodes = useNodes();
  const attachments = useAttachments();
  const [isBusy, setIsBusy] = useState(false);

  const lastAttachments = useRef<IAttachments>({});

  useEffect(() => {
    if (!layoutNodes) {
      return;
    }
    setIsBusy(true);

    const prevAttachments = lastAttachments.current;
    const allAttachments = Object.values(attachments)
      .flat()
      .filter((a) => typeof a !== 'undefined') as IAttachment[];

    const settled = allAttachments.every((a) => a.uploaded && !a.deleting && !a.updating);

    if (settled) {
      const { changedNodeIds, addedAttachments, removedAttachments } = getChangedAttachments(
        attachments as IAttachments<UploadedAttachment>,
        prevAttachments as IAttachments<UploadedAttachment>,
      );
      if (changedNodeIds.length) {
        lastAttachments.current = attachments;
        const allNodes = layoutNodes.allNodes();

        const changedNodes = allNodes.filter((n) => changedNodeIds.includes(n.item.id));

        const addedAttachmentChanges = addedAttachments
          .map(({ nodeId, attachmentId }) => ({
            node: allNodes.find((n) => n.item.id === nodeId),
            attachmentId,
          }))
          .filter(({ node }) => node) as AttachmentChange[];

        const removedAttachmentChanges = removedAttachments
          .map(({ nodeId, attachmentId }) => ({
            node: allNodes.find((n) => n.item.id === nodeId),
            attachmentId,
          }))
          .filter(({ node }) => node) as AttachmentChange[];

        onChangeEvent(changedNodes, addedAttachmentChanges, removedAttachmentChanges);
      }
      setIsBusy(false);
    }
  }, [attachments, layoutNodes, onChangeEvent]);

  return isBusy;
}

function getChangedAttachments(current: IAttachments<UploadedAttachment>, prev: IAttachments<UploadedAttachment>) {
  const changedNodeIds: string[] = [];
  for (const [componentId, attachments] of Object.entries(current)) {
    if (!prev[componentId]?.length && !attachments?.length) {
      // Special case that happens when adding the first attachment.
      // It goes from undefined to an empty array and we don't want to trigger a change twice
      continue;
    }
    if (!deepEqual(prev[componentId], attachments)) {
      changedNodeIds.push(componentId);
    }
  }

  const addedAttachments: { attachmentId: string; nodeId: string }[] = [];
  for (const [componentId, attachments] of Object.entries(current)) {
    for (const attachment of attachments ?? []) {
      if (!prev[componentId]?.find((a) => a.data.id === attachment.data.id)) {
        addedAttachments.push({ attachmentId: attachment.data.id, nodeId: componentId });
      }
    }
  }

  const removedAttachments: { attachmentId: string; nodeId: string }[] = [];
  for (const [componentId, attachments] of Object.entries(prev)) {
    for (const attachment of attachments ?? []) {
      if (!current[componentId]?.find((a) => a.data.id === attachment.data.id)) {
        removedAttachments.push({ attachmentId: attachment.data.id, nodeId: componentId });
      }
    }
  }

  return { changedNodeIds, addedAttachments, removedAttachments };
}
