import { useEffect, useRef } from 'react';

import { useImmer } from 'use-immer';

import { type IAttachments, isAttachmentUploaded, type UploadedAttachment } from 'src/features/attachments';
import { useAttachments } from 'src/features/attachments/AttachmentsContext';
import { ValidationMask, type ValidationState } from 'src/features/validation';
import { getValidationsForNode } from 'src/features/validation/utils';
import {
  addVisibilityForAttachment,
  addVisibilityForNode,
  getVisibilityForNode,
  removeVisibilityForAttachment,
  removeVisibilityForNode,
  setVisibilityForNode,
  type Visibility,
} from 'src/features/validation/visibility/visibilityUtils';
import { useAsRef } from 'src/hooks/useAsRef';
import { useNodes } from 'src/utils/layout/NodesContext';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

/**
 * Manages the visibility state of validations on components
 */
export function useVisibility(validations: ValidationState) {
  const layoutPages = useNodes();
  const nodesRef = useAsRef(layoutPages);
  const lastNodes = useRef<LayoutNode[]>([]);
  const currentAttachments = useAttachments();
  const lastAttachments = useRef<IAttachments<UploadedAttachment>>({});

  const [visibility, setVisibility] = useImmer<Visibility>({
    mask: 0,
    children: {},
    items: [],
  });

  /**
   * Add and remove visibility as nodes are added and removed
   */
  useEffect(() => {
    const newNodes = layoutPages.allNodes();
    const prevNodes = lastNodes.current;
    const addedNodes = newNodes.filter((n) => !prevNodes.find((pn) => pn.item.id === n.item.id));
    const removedNodes = prevNodes.filter((pn) => !newNodes.find((n) => pn.item.id === n.item.id));

    lastNodes.current = newNodes;

    if (addedNodes.length === 0 && removedNodes.length === 0) {
      return;
    }

    setVisibility((state) => {
      removedNodes.forEach((node) => removeVisibilityForNode(node, state));
      addedNodes.forEach((node) => addVisibilityForNode(node, state));
    });
  }, [layoutPages, setVisibility]);

  /**
   * Reduce the visibility mask as validations are removed
   */
  useEffect(() => {
    setVisibility((state) => {
      for (const node of nodesRef.current.allNodes()) {
        const currentValidationMask = getValidationsForNode(
          node,
          validations,
          ValidationMask.AllIncludingBackend,
        ).reduce((mask, validation) => mask | validation.category, 0);

        const currentVisibilityMask = getVisibilityForNode(node, state);

        setVisibilityForNode(node, state, currentValidationMask & currentVisibilityMask);
      }
    });
  }, [nodesRef, setVisibility, validations]);

  /**
   * Add and remove visibility as attachments are added and removed
   */
  useEffect(() => {
    const prevAttachments = lastAttachments.current;

    const addedAttachments: { attachmentId: string; nodeId: string }[] = [];
    for (const [componentId, attachments] of Object.entries(currentAttachments)) {
      for (const attachment of attachments ?? []) {
        if (
          isAttachmentUploaded(attachment) &&
          !prevAttachments[componentId]?.find((a) => a.data.id === attachment.data.id)
        ) {
          addedAttachments.push({ attachmentId: attachment.data.id, nodeId: componentId });
        }
      }
    }

    const removedAttachments: { attachmentId: string; nodeId: string }[] = [];
    for (const [componentId, attachments] of Object.entries(prevAttachments)) {
      for (const attachment of attachments ?? []) {
        if (currentAttachments[componentId]?.find((a) => isAttachmentUploaded(a) && a.data.id === attachment.data.id)) {
          removedAttachments.push({ attachmentId: attachment.data.id, nodeId: componentId });
        }
      }
    }

    if (addedAttachments.length === 0 && removedAttachments.length === 0) {
      return;
    }

    const nodes = nodesRef.current.allNodes();

    setVisibility((state) => {
      removedAttachments.forEach(({ attachmentId, nodeId }) => {
        const node = nodes.find((n) => n.item.id === nodeId);
        if (!node) {
          return;
        }
        removeVisibilityForAttachment(attachmentId, node, state);
      });

      addedAttachments.forEach(({ attachmentId, nodeId }) => {
        const node = nodes.find((n) => n.item.id === nodeId);
        if (!node) {
          return;
        }
        addVisibilityForAttachment(attachmentId, node, state);
      });
    });
  }, [currentAttachments, nodesRef, setVisibility]);

  return { visibility, setVisibility };
}
