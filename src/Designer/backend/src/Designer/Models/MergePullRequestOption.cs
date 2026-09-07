using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models;

/// <summary>
/// Model holding details for merging a pull request. Property names follow the Gitea API, which mixes casing styles.
/// </summary>
public class MergePullRequestOption
{
    [JsonPropertyName("Do")]
    public string Do { get; set; } = "merge";

    [JsonPropertyName("MergeTitleField")]
    public string? MergeTitleField { get; set; }

    [JsonPropertyName("MergeMessageField")]
    public string? MergeMessageField { get; set; }

    [JsonPropertyName("delete_branch_after_merge")]
    public bool DeleteBranchAfterMerge { get; set; }
}
