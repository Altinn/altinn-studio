export type AppUpgradeStatus = {
  backendVersion: string | null;
  frontendVersion: string | null;
  targetMajorVersion: number;
  isUpgradeAvailable: boolean;
  isAutomaticUpgradeSupported: boolean;
  hasCustomCode: boolean;
};

export type AppUpgradeOutcome =
  'Completed' | 'ManualStepsRequired' | 'UnsupportedVersion' | 'LocalChangesBlocking' | 'Failed';

export type AppUpgradeMessageStatus = 'Info' | 'Ok' | 'Skip' | 'Warning' | 'Todo' | 'Failed';

export type AppUpgradeMessage = {
  text: string;
  status: AppUpgradeMessageStatus;
};

export type AppUpgradeStep = {
  name: string;
  messages: AppUpgradeMessage[];
};

export type AppUpgradeManualTask = {
  step: string;
  text: string;
  status: AppUpgradeMessageStatus;
};

export type AppUpgradeResult = {
  outcome: AppUpgradeOutcome;
  message: string;
  targetMajorVersion: number;
  steps: AppUpgradeStep[];
  manualTasks: AppUpgradeManualTask[];
  branchName: string | null;
  pullRequestUrl: string | null;
};

export type AppUpgradePreparationStatus = 'Ready' | 'LocalChangesBlocking' | 'UnsupportedVersion';

export type AppUpgradePreparation = {
  status: AppUpgradePreparationStatus;
  message: string;
};
