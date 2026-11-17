import {
  useIsProcessNextPending,
  useIsProcessResumePending,
  useIsRunningProcessNext,
} from 'src/core/queries/process/mutationState';
import {
  useCommitProcessTransition,
  useInvalidateProcessFormData,
  useProcessNextMutation,
  useProcessResumeMutation,
} from 'src/core/queries/process/processMutations';

export {
  useProcessNextMutation,
  useProcessResumeMutation,
  useCommitProcessTransition,
  useInvalidateProcessFormData,
  useIsProcessNextPending,
  useIsProcessResumePending,
  useIsRunningProcessNext,
};
