namespace Altinn.Studio.Designer.Models.Dto.AppUpgrade;

public sealed record AppUpgradeDiscardRequest(string BranchName, long? PullRequestNumber);

public sealed record AppUpgradeDiscardResult(bool IsDiscarded, string Message);
