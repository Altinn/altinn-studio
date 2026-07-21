import React from 'react';
import type { PropsWithChildren } from 'react';

import { Loader } from 'src/core/loading/Loader';
import { UpdateAttachmentsForCypress } from 'src/features/attachments/UpdateAttachmentsForCypress';
import { useProcessQuery } from 'src/features/instance/useProcessQuery';
import { RunOptionsEffects } from 'src/features/options/RunOptionsEffects';
import { useNavigationParam } from 'src/hooks/navigation';
import { TaskKeys } from 'src/routesBuilder';

export function FormRuntimeEffects({ children }: PropsWithChildren) {
  const isInTaskTransition = useIsInTaskTransition();

  if (isInTaskTransition) {
    return <Loader reason='form-effects' />;
  }

  return (
    <>
      <RunOptionsEffects />
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
