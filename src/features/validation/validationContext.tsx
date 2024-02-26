import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { createContext } from 'src/core/contexts/context';
import { Loader } from 'src/core/loading/Loader';
import { useHasPendingAttachments } from 'src/features/attachments/AttachmentsContext';
import { FD } from 'src/features/formData/FormDataWrite';
import { useBackendValidation } from 'src/features/validation/backendValidation/useBackendValidation';
import { useExpressionValidation } from 'src/features/validation/expressionValidation/useExpressionValidation';
import { useInvalidDataValidation } from 'src/features/validation/invalidDataValidation/useInvalidDataValidation';
import { useNodeValidation } from 'src/features/validation/nodeValidation/useNodeValidation';
import { useSchemaValidation } from 'src/features/validation/schemaValidation/useSchemaValidation';
import {
  getVisibilityMask,
  hasValidationErrors,
  mergeFieldValidations,
  selectValidations,
} from 'src/features/validation/utils';
import { useVisibility } from 'src/features/validation/visibility/useVisibility';
import {
  onBeforeRowDelete,
  setVisibilityForAttachment,
  setVisibilityForNode,
} from 'src/features/validation/visibility/visibilityUtils';
import { useAsRef } from 'src/hooks/useAsRef';
import { useEffectEvent } from 'src/hooks/useEffectEvent';
import { useWaitForState } from 'src/hooks/useWaitForState';
import type { BackendValidationIssueGroups, ValidationContext } from 'src/features/validation';
import type { CompRepeatingGroupInternal } from 'src/layout/RepeatingGroup/config.generated';
import type { BaseLayoutNode, LayoutNode } from 'src/utils/layout/LayoutNode';

const { Provider, useCtx } = createContext<ValidationContext>({
  name: 'ValidationContext',
  required: true,
});

type Props = {
  children: React.ReactNode;
  isCustomReceipt?: boolean;
};

export function ValidationContext({ children, isCustomReceipt = false }: Props) {
  // Get component validations
  const componentValidations = useNodeValidation();

  // Get expression validations
  const expressionValidations = useExpressionValidation();

  // Get schema validations
  const schemaValidations = useSchemaValidation();

  // Get invalid data validations
  const invalidDataValdiations = useInvalidDataValidation();

  // Get backend validations except if we are in a custom receipt
  const {
    validations: backendValidations,
    processedLast: backendValidationsProcessedLast,
    initialValidationDone,
  } = useBackendValidation({ enabled: !isCustomReceipt });

  const waitForSave = FD.useWaitForSave();
  const backendValidationsProcessedLastRef = useAsRef(backendValidationsProcessedLast);
  const waitForBackendValidations = useWaitForState(backendValidationsProcessedLastRef);
  const hasPendingAttachments = useHasPendingAttachments();

  // Merge backend and frontend validations
  const validations = useMemo(
    () => ({
      task: backendValidations.task,
      fields: mergeFieldValidations(
        backendValidations.fields,
        invalidDataValdiations,
        schemaValidations,
        expressionValidations,
      ),
      components: componentValidations,
    }),
    [
      backendValidations.fields,
      backendValidations.task,
      expressionValidations,
      componentValidations,
      invalidDataValdiations,
      schemaValidations,
    ],
  );

  // Provide a promise that resolves when all pending validations have been completed
  const pendingAttachmentsRef = useAsRef(hasPendingAttachments);
  const waitForAttachments = useWaitForState(pendingAttachmentsRef);

  const validating = useCallback(async () => {
    await waitForAttachments((state) => !state);

    // Wait until we've saved changed to backend, and we've processed the backend validations we got from that save
    const validationsFromSave = await waitForSave();
    await waitForBackendValidations((processedLast) => processedLast === validationsFromSave);

    // At last, return a function to the caller that can be used to check if their local state is up-to-date
    return (lastBackendValidations: BackendValidationIssueGroups | undefined) =>
      lastBackendValidations === validationsFromSave;
  }, [waitForAttachments, waitForBackendValidations, waitForSave]);

  /**
   * Manage the visibility of validations
   */
  const { visibility, setVisibility } = useVisibility(validations);

  // Set visibility for a node
  const setNodeVisibility = useEffectEvent((nodes: LayoutNode[], newVisibility: number, rowIndex?: number) => {
    setVisibility((state) => {
      nodes.forEach((node) => setVisibilityForNode(node, state, newVisibility, rowIndex));
    });
  });

  // Properly remove visibility for a row when it is deleted
  const removeRowVisibilityOnDelete = useEffectEvent(
    (node: BaseLayoutNode<CompRepeatingGroupInternal>, rowIndex: number) => {
      setVisibility((state) => {
        onBeforeRowDelete(node, rowIndex, state);
      });
    },
  );

  const setAttachmentVisibility = useEffectEvent((attachmentId: string, node: LayoutNode, newVisibility: number) => {
    setVisibility((state) => {
      setVisibilityForAttachment(attachmentId, node, state, newVisibility);
    });
  });

  /**
   * This is a last resort to show all errors, to prevent unknown error
   * if this is ever visible, there is probably something wring in the app.
   */
  const [showAllErrors, setShowAllErrors] = useState(false);

  /**
   * Hide unbound errors as soon as possible.
   */
  useEffect(() => {
    if (showAllErrors) {
      const backendMask = getVisibilityMask(['Backend', 'CustomBackend']);
      const hasFieldErrors =
        Object.values(validations.fields).flatMap((field) => selectValidations(field, backendMask, 'error')).length > 0;

      if (!hasFieldErrors && !hasValidationErrors(validations.task)) {
        setShowAllErrors(false);
      }
    }
  }, [showAllErrors, validations.fields, validations.task]);

  const out = {
    state: validations,
    setShowAllErrors,
    showAllErrors,
    validating,
    visibility,
    setNodeVisibility,
    setAttachmentVisibility,
    removeRowVisibilityOnDelete,
    backendValidationsProcessedLast,
  };

  if (!initialValidationDone && !isCustomReceipt) {
    return <Loader reason='validation' />;
  }

  return <Provider value={out}>{children}</Provider>;
}

export const useValidationContext = useCtx;
export const useOnDeleteGroupRow = () => useCtx().removeRowVisibilityOnDelete;
