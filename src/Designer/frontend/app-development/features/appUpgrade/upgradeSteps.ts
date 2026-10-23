import type { AppUpgradeRun } from 'app-shared/types/AppUpgrade';

export const upgradeStepTextKeys = [
  'app_upgrade.progress.step.create_branch',
  'app_upgrade.progress.step.upgrade',
  'app_upgrade.progress.step.build',
  'app_upgrade.progress.step.save',
] as const;

// The names of the steps in the Gitea Actions workflow that AppUpgradeWorkflow renders in the backend.
const stepIndexByWorkflowStep: Record<string, number> = {
  'Clone the app': 0,
  'Install tools': 0,
  'Upgrade the app': 1,
  'Check that the app builds': 2,
  'Save the changes': 3,
};

export const getCurrentStepIndex = (run?: AppUpgradeRun): number =>
  run?.state === 'Running' && run.currentStep ? (stepIndexByWorkflowStep[run.currentStep] ?? 0) : 0;
