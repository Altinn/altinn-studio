namespace Altinn.Studio.Designer.Models.Dto.AppUpgrade;

public sealed record AppUpgradeMergeRequest(long PullRequestNumber, string? BranchName);

public sealed record AppUpgradeMergeResult(bool IsMerged, string Message, string? BaseBranch = null);
