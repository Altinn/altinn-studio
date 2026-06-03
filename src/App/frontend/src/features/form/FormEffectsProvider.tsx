import React, { useLayoutEffect } from 'react';
import type { PropsWithChildren } from 'react';

import { Loader } from 'src/core/loading/Loader';
import { UpdateAttachmentsForCypress } from 'src/features/attachments/UpdateAttachmentsForCypress';
import { FormStore } from 'src/features/form/FormContext';
import { FormEffects } from 'src/features/form/FormEffects';
import { useProcessQuery } from 'src/features/instance/useProcessQuery';
import { useNavigationParam } from 'src/hooks/navigation';
import { TaskKeys } from 'src/routesBuilder';
import { LayoutPropertiesValidation } from 'src/utils/layout/validation/LayoutPropertiesValidation';
import { LayoutValidationProvider } from 'src/utils/layout/validation/LayoutValidationContext';

export function FormEffectsProvider({ children }: PropsWithChildren) {
  const isInTaskTransition = useIsInTaskTransition();
  const layouts = FormStore.bootstrap.useLayouts();
  const resetDiagnostics = FormStore.raw.useStaticSelector((state) => state.layoutDiagnostics.reset);

  useLayoutEffect(() => {
    resetDiagnostics();
  }, [layouts, resetDiagnostics]);

  if (isInTaskTransition) {
    return <Loader reason='form-effects' />;
  }

  return (
    <>
      <LayoutValidationProvider>
        <LayoutPropertiesValidation />
      </LayoutValidationProvider>
      <FormEffects />
      {window.Cypress && <UpdateAttachmentsForCypress />}
      {children}
    </>
  );
}

/**
 * When navigating to process/next, the taskId transitions to a new one. Layouts will be updated as well, but that
 * takes time. This hook returns true when in such a transition.
 */
function useIsInTaskTransition() {
  const currentTask = useProcessQuery().data?.currentTask?.elementId;
  const taskIdFromUrl = useNavigationParam('taskId');

  if ([TaskKeys.ProcessEnd, TaskKeys.CustomReceipt].includes(taskIdFromUrl as TaskKeys) && !currentTask) {
    return false;
  }

  return currentTask !== taskIdFromUrl;
}
