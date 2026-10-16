import {
  useIsProcessNextPending,
  useIsProcessResumePending,
  useIsRunningProcessNext,
} from 'src/core/queries/process/mutationState';
import {
  getTargetTaskFromProcess,
  useProcessNext,
  useProcessNextOutsideFormProvider,
  useProcessResume,
} from 'src/core/queries/process/useProcessNext';
export {
  useProcessNext,
  useProcessNextOutsideFormProvider,
  useProcessResume,
  getTargetTaskFromProcess,
  useIsProcessNextPending,
  useIsProcessResumePending,
  useIsRunningProcessNext,
};
