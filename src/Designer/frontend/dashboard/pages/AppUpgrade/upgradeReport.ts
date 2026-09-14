import type { AppUpgradeManualTask, AppUpgradeResult } from 'app-shared/types/AppUpgrade';

export const groupManualTasksByStep = (
  manualTasks: AppUpgradeManualTask[],
): Record<string, AppUpgradeManualTask[]> =>
  manualTasks.reduce<Record<string, AppUpgradeManualTask[]>>((groups, task) => {
    groups[task.step] = [...(groups[task.step] ?? []), task];
    return groups;
  }, {});

export const buildMarkdownReport = (org: string, app: string, result: AppUpgradeResult): string => {
  const lines: string[] = [
    `# Upgrade report for ${org}/${app}`,
    '',
    `Target: Altinn.App v${result.targetMajorVersion}`,
    `Outcome: ${result.outcome}`,
    result.message ? `Message: ${result.message}` : '',
    '',
  ];
  if (result.manualTasks.length > 0) {
    lines.push('## Manual tasks', '');
    result.manualTasks.forEach((task) =>
      lines.push(`- [${task.status}] ${task.step}: ${task.text}`),
    );
    lines.push('');
  }
  lines.push('## All steps', '');
  result.steps.forEach((step) => {
    lines.push(`### ${step.name}`);
    step.messages.forEach((message) => lines.push(`- ${message.status}: ${message.text}`));
    lines.push('');
  });
  return lines.join('\n');
};

export const buildManualTasksText = (manualTasks: AppUpgradeManualTask[]): string =>
  manualTasks.map((task) => `- ${task.step}: ${task.text}`).join('\n');
