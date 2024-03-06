import { useEffect, useRef } from 'react';

import { original } from 'immer';

import { type IAttachments, isAttachmentUploaded, type UploadedAttachment } from 'src/features/attachments';
import { useAttachments } from 'src/features/attachments/AttachmentsContext';
import { ValidationMask, type ValidationState } from 'src/features/validation';
import { getInitialMaskFromNode, getValidationsForNode } from 'src/features/validation/utils';
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
export function useVisibility(
  validations: ValidationState,
  setVisibility: (updater: (draft: Visibility) => void) => void,
) {
  const layoutPages = useNodes();
  const nodesRef = useAsRef(layoutPages);
  const lastNodes = useRef<LayoutNode[]>([]);
  const currentAttachments = useAttachments();
  const lastAttachments = useRef<IAttachments<UploadedAttachment>>({});

  /**
   * Add and remove visibility as nodes are added and removed
   */
  useEffect(() => {
    const newNodes = layoutPages.allNodes();
    const prevNodes = lastNodes.current;

    const { addedNodes, removedNodes } = getNodeChanges(prevNodes, newNodes);

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

        // Checking the current(state) is much cheaper than checking the draft, so its worth
        // potentially doing it twice to not make unnecessary updates
        const fasterState = original(state) ?? state;
        const currentVisibilityMask = getVisibilityForNode(node, fasterState);
        const newVisibilityMask = currentVisibilityMask & currentValidationMask;

        // Updating is a bit expensive, so only do it if the mask is different
        // We need to OR with the initial mask for comparison as this always happens when the
        // mask is updated, otherwise there could be false positives
        const initialMask = getInitialMaskFromNode(node);
        if ((newVisibilityMask | initialMask) === currentVisibilityMask) {
          continue;
        }

        setVisibilityForNode(node, state, newVisibilityMask);
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
    const nodeMap = new Map<string, LayoutNode>();
    for (const node of nodes) {
      nodeMap.set(node.item.id, node);
    }

    setVisibility((state) => {
      removedAttachments.forEach(({ attachmentId, nodeId }) => {
        const node = nodeMap.get(nodeId);
        if (!node) {
          return;
        }
        removeVisibilityForAttachment(attachmentId, node, state);
      });

      addedAttachments.forEach(({ attachmentId, nodeId }) => {
        const node = nodeMap.get(nodeId);
        if (!node) {
          return;
        }
        addVisibilityForAttachment(attachmentId, node, state);
      });
    });
  }, [currentAttachments, nodesRef, setVisibility]);
}

function getNodeChanges(prevNodes: LayoutNode[], newNodes: LayoutNode[]) {
  const newNodeIds = new Set<string>();
  for (const node of newNodes) {
    newNodeIds.add(node.item.id);
  }

  const prevNodeIds = new Set<string>();
  const removedNodes: LayoutNode[] = [];
  for (const node of prevNodes) {
    prevNodeIds.add(node.item.id);

    if (newNodeIds.has(node.item.id)) {
      continue;
    }
    removedNodes.push(node);
  }

  const addedNodes: LayoutNode[] = [];
  for (const node of newNodes) {
    if (prevNodeIds.has(node.item.id)) {
      continue;
    }
    addedNodes.push(node);
  }

  return { addedNodes, removedNodes };
}
