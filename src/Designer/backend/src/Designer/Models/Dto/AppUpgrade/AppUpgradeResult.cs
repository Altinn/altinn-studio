using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models.Dto.AppUpgrade;

public sealed record AppUpgradeResult(
    AppUpgradeOutcome Outcome,
    string Message,
    int TargetMajorVersion,
    IReadOnlyList<AppUpgradeStep> Steps,
    IReadOnlyList<AppUpgradeManualTask> ManualTasks,
    string? BranchName = null,
    string? PullRequestUrl = null
);

public sealed record AppUpgradeStep(string Name, IReadOnlyList<AppUpgradeMessage> Messages);

public sealed record AppUpgradeMessage(string Text, AppUpgradeMessageStatus Status);

public sealed record AppUpgradeManualTask(string Step, string Text, AppUpgradeMessageStatus Status);
