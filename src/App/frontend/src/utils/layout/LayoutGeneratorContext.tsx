import React, { useLayoutEffect } from 'react';
import type { PropsWithChildren } from 'react';

import { Loader } from 'src/core/loading/Loader';
import { UpdateAttachmentsForCypress } from 'src/features/attachments/UpdateAttachmentsForCypress';
import { FormStore } from 'src/features/form/FormContext';
import { useProcessQuery } from 'src/features/instance/useProcessQuery';
import { useNavigationParam } from 'src/hooks/navigation';
import { TaskKeys } from 'src/routesBuilder';
import { GeneratorGlobalProvider } from 'src/utils/layout/generator/GeneratorContext';
import { LayoutSetGenerator } from 'src/utils/layout/generator/LayoutSetGenerator';
import { GeneratorValidationProvider } from 'src/utils/layout/generator/validation/GenerationValidationContext';

export function LayoutGeneratorProvider({ children }: PropsWithChildren) {
  const isInTaskTransition = useIsInTaskTransition();
  const layouts = FormStore.bootstrap.useLayouts();
  const resetDiagnostics = FormStore.raw.useStaticSelector((state) => state.layoutDiagnostics.reset);

  useLayoutEffect(() => {
    resetDiagnostics();
  }, [layouts, resetDiagnostics]);

  if (isInTaskTransition) {
    return <Loader reason='nodes' />;
  }

  return (
    <GeneratorGlobalProvider layouts={layouts}>
      <GeneratorValidationProvider>
        <LayoutSetGenerator />
      </GeneratorValidationProvider>
      {window.Cypress && <UpdateAttachmentsForCypress />}
      {children}
    </GeneratorGlobalProvider>
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
