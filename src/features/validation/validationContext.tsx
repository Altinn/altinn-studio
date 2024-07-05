import React, { useCallback, useEffect, useRef } from 'react';
import type { PropsWithChildren } from 'react';

import { createStore } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import { createZustandContext } from 'src/core/contexts/zustandContext';
import { Loader } from 'src/core/loading/Loader';
import { useHasPendingAttachments } from 'src/features/attachments/AttachmentsContext';
import { FD } from 'src/features/formData/FormDataWrite';
import { useShouldValidateInitial } from 'src/features/validation/backendValidation/backendValidationUtils';
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
import { useWaitForState } from 'src/hooks/useWaitForState';
import type {
  BackendValidationIssueGroups,
  BaseValidation,
  ComponentValidations,
  FieldValidations,
  ValidationContext,
  WaitForValidation,
} from 'src/features/validation';
import type { Visibility } from 'src/features/validation/visibility/visibilityUtils';
import type { WaitForState } from 'src/hooks/useWaitForState';

interface NewStoreProps {
  validating: WaitForValidation;
}

interface Internals {
  isLoading: boolean;
  individualValidations: {
    backend: FieldValidations;
    component: ComponentValidations;
    expression: FieldValidations;
    schema: FieldValidations;
    invalidData: FieldValidations;
  };
  issueGroupsProcessedLast: BackendValidationIssueGroups | undefined;
  updateValidations: <K extends keyof Internals['individualValidations']>(
    key: K,
    value: Internals['individualValidations'][K],
    issueGroups?: BackendValidationIssueGroups,
  ) => void;
  updateTaskValidations: (validations: BaseValidation[]) => void;
  updateVisibility: (mutator: (visibility: Visibility) => void) => void;
  updateValidating: (validating: WaitForValidation) => void;
}

function initialCreateStore({ validating }: NewStoreProps) {
  return createStore<ValidationContext & Internals>()(
    immer((set) => ({
      // =======
      // Publicly exposed state
      state: {
        task: [],
        fields: {},
        components: {},
      },
      visibility: {
        mask: 0,
        children: {},
        items: [],
      },
      removeRowVisibilityOnDelete: (node, rowIndex) =>
        set((state) => {
          onBeforeRowDelete(node, rowIndex, state.visibility);
        }),
      setNodeVisibility: (nodes, newVisibility, rowIndex) =>
        set((state) => {
          nodes.forEach((node) => setVisibilityForNode(node, state.visibility, newVisibility, rowIndex));
        }),
      setAttachmentVisibility: (attachmentId, node, newVisibility) =>
        set((state) => {
          setVisibilityForAttachment(attachmentId, node, state.visibility, newVisibility);
        }),
      setShowAllErrors: (newValue) =>
        set((state) => {
          state.showAllErrors = newValue;
        }),
      showAllErrors: false,
      validating,

      // =======
      // Internal state
      isLoading: true,
      individualValidations: {
        backend: {},
        component: {},
        expression: {},
        schema: {},
        invalidData: {},
      },
      issueGroupsProcessedLast: undefined,
      updateValidations: (key, validations, issueGroups) =>
        set((state) => {
          if (key === 'backend') {
            state.isLoading = false;
            state.issueGroupsProcessedLast = issueGroups;
          }
          state.individualValidations[key] = validations;
          if (key === 'component') {
            state.state.components = validations as ComponentValidations;
          } else {
            state.state.fields = mergeFieldValidations(
              state.individualValidations.backend,
              state.individualValidations.invalidData,
              state.individualValidations.schema,
              state.individualValidations.expression,
            );
          }
        }),
      updateTaskValidations: (validations) =>
        set((state) => {
          state.state.task = validations;
        }),
      updateVisibility: (mutator) =>
        set((state) => {
          mutator(state.visibility);
        }),
      updateValidating: (newValidating) =>
        set((state) => {
          state.validating = newValidating;
        }),
    })),
  );
}

const {
  Provider,
  useSelector,
  useLaxSelector,
  useDelayedMemoSelector,
  useSelectorAsRef,
  useStore,
  useLaxSelectorAsRef,
} = createZustandContext({
  name: 'Validation',
  required: true,
  initialCreateStore,
  onReRender: (store, { validating }) => {
    store.getState().updateValidating(validating);
  },
});

export function ValidationProvider({ children }: PropsWithChildren) {
  const waitForSave = FD.useWaitForSave();
  const waitForStateRef = useRef<WaitForState<ValidationContext & Internals, unknown>>();
  const hasPendingAttachments = useHasPendingAttachments();

  // Provide a promise that resolves when all pending validations have been completed
  const pendingAttachmentsRef = useAsRef(hasPendingAttachments);
  const waitForAttachments = useWaitForState(pendingAttachmentsRef);

  const validating: WaitForValidation = useCallback(
    async (forceSave = true) => {
      await waitForAttachments((state) => !state);

      // Wait until we've saved changed to backend, and we've processed the backend validations we got from that save
      const validationsFromSave = await waitForSave(forceSave);
      await waitForStateRef.current!((state) => state.issueGroupsProcessedLast === validationsFromSave);
    },
    [waitForAttachments, waitForSave],
  );

  return (
    <Provider validating={validating}>
      <MakeWaitForState waitForStateRef={waitForStateRef} />
      <UpdateValidations />
      <ManageVisibility />
      <LoadingBlocker>{children}</LoadingBlocker>
    </Provider>
  );
}

function MakeWaitForState({
  waitForStateRef,
}: {
  waitForStateRef: React.MutableRefObject<WaitForState<ValidationContext & Internals, unknown> | undefined>;
}) {
  waitForStateRef.current = useWaitForState(useStore());
  return null;
}

function LoadingBlocker({ children }: PropsWithChildren) {
  const isLoading = useSelector((state) => state.isLoading);
  const shouldValidateInitial = useShouldValidateInitial();

  if (isLoading && shouldValidateInitial) {
    return <Loader reason='validation' />;
  }

  return <>{children}</>;
}

function UpdateValidations() {
  const updateValidations = useSelector((state) => state.updateValidations);
  const backendValidation = useBackendValidation();

  useEffect(() => {
    const { validations: backendValidations, processedLast, initialValidationDone } = backendValidation;
    if (initialValidationDone) {
      updateValidations('backend', backendValidations, processedLast);
    }
  }, [backendValidation, updateValidations]);

  const componentValidations = useNodeValidation();
  const expressionValidations = useExpressionValidation();
  const schemaValidations = useSchemaValidation();
  const invalidDataValidations = useInvalidDataValidation();

  useEffect(() => {
    updateValidations('component', componentValidations);
  }, [componentValidations, updateValidations]);

  useEffect(() => {
    updateValidations('expression', expressionValidations);
  }, [expressionValidations, updateValidations]);

  useEffect(() => {
    updateValidations('schema', schemaValidations);
  }, [schemaValidations, updateValidations]);

  useEffect(() => {
    updateValidations('invalidData', invalidDataValidations);
  }, [invalidDataValidations, updateValidations]);

  return null;
}

function ManageVisibility() {
  const validations = useSelector((state) => state.state);
  const setVisibility = useSelector((state) => state.updateVisibility);
  const showAllErrors = useSelector((state) => state.showAllErrors);
  const setShowAllErrors = useSelector((state) => state.setShowAllErrors);

  useVisibility(validations, setVisibility);

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
  }, [setShowAllErrors, showAllErrors, validations.fields, validations.task]);

  return null;
}

/**
 * This hook returns a function that lets you select one or more fields from the validation state. The hook will
 * only force a re-render if the selected fields have changed.
 */
function useDelayedSelector<U>(
  outerSelector: (state: ValidationContext) => U,
): <U2>(cacheKey: string, innerSelector: (state: U) => U2) => U2 {
  const selector = useDelayedMemoSelector();
  const callbacks = useRef<Record<string, Parameters<typeof selector>[0]>>({});

  useEffect(() => {
    callbacks.current = {};
  }, [selector]);

  return useCallback(
    (cacheKey, innerSelector) => {
      if (!callbacks.current[cacheKey]) {
        callbacks.current[cacheKey] = (state) => innerSelector(outerSelector(state));
      }
      return selector(callbacks.current[cacheKey]) as any;
    },
    // The outer selector is not expected to change, so we don't need to include it in the dependencies
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selector],
  );
}

export type ValidationSelector = ReturnType<typeof useDelayedSelector<ValidationContext>>;
export type ValidationFieldSelector = ReturnType<typeof useDelayedSelector<FieldValidations>>;
export type ValidationComponentSelector = ReturnType<typeof useDelayedSelector<ComponentValidations>>;
export type ValidationVisibilitySelector = ReturnType<typeof useDelayedSelector<Visibility>>;

export const Validation = {
  useFullStateRef: () => useSelectorAsRef((state) => state.state),

  // Selectors. These are memoized, so they won't cause a re-render unless the selected fields change.
  useSelector: () => useDelayedSelector((state) => state),
  useFieldSelector: () => useDelayedSelector((state) => state.state.fields),
  useComponentSelector: () => useDelayedSelector((state) => state.state.components),
  useVisibilitySelector: () => useDelayedSelector((state) => state.visibility),

  useOnDeleteGroupRow: () => useSelector((state) => state.removeRowVisibilityOnDelete),
  useSetAttachmentVisibility: () => useSelector((state) => state.setAttachmentVisibility),
  useSetNodeVisibility: () => useSelector((state) => state.setNodeVisibility),
  useSetShowAllErrors: () => useSelector((state) => state.setShowAllErrors),
  useValidating: () => useSelector((state) => state.validating),
  useUpdateTaskValidations: () => useLaxSelector((state) => state.updateTaskValidations),

  useLaxRef: () => useLaxSelectorAsRef((state) => state),
};
