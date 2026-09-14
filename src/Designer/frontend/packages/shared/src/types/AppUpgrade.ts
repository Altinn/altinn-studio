export type AppUpgradeStatus = {
  backendVersion: string | null;
  frontendVersion: string | null;
  targetMajorVersion: number;
  isUpgradeAvailable: boolean;
  isAutomaticUpgradeSupported: boolean;
  hasCustomCode: boolean;
};

export type AppUpgradeOutcome =
  'Completed' | 'ManualStepsRequired' | 'UnsupportedVersion' | 'Failed';

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

export type AppUpgradeFileChangeKind = 'Added' | 'Modified' | 'Deleted' | 'Renamed';

export type AppUpgradeFileChange = {
  path: string;
  kind: AppUpgradeFileChangeKind;
  diff: string;
};

export type AppUpgradeResult = {
  outcome: AppUpgradeOutcome;
  message: string;
  targetMajorVersion: number;
  steps: AppUpgradeStep[];
  manualTasks: AppUpgradeManualTask[];
  fileChanges: AppUpgradeFileChange[];
  branchName: string | null;
  pullRequestUrl: string | null;
  pullRequestNumber: number | null;
};

export type AppUpgradeStartStatus = 'Started' | 'UnsupportedVersion' | 'Failed';

export type AppUpgradeStart = {
  status: AppUpgradeStartStatus;
  message: string;
  branchName: string | null;
};

export type AppUpgradeRunState = 'Queued' | 'Running' | 'Completed';

export type AppUpgradeRun = {
  state: AppUpgradeRunState;
  runUrl: string | null;
  currentStep: string | null;
  result: AppUpgradeResult | null;
};

export type AppUpgradeMergeRequest = {
  pullRequestNumber: number;
  branchName: string | null;
};

export type AppUpgradeMergeResult = {
  isMerged: boolean;
  message: string;
  baseBranch: string | null;
};
