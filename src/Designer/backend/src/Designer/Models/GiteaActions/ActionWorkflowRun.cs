using System;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models.GiteaActions;

public class ActionWorkflowRun
{
    public long Id { get; set; }

    public string? Status { get; set; }

    public string? Conclusion { get; set; }

    [JsonPropertyName("head_branch")]
    public string? HeadBranch { get; set; }

    [JsonPropertyName("head_sha")]
    public string? HeadSha { get; set; }

    [JsonPropertyName("html_url")]
    public string? HtmlUrl { get; set; }

    [JsonPropertyName("display_title")]
    public string? DisplayTitle { get; set; }

    [JsonPropertyName("started_at")]
    public DateTimeOffset? StartedAt { get; set; }

    [JsonPropertyName("completed_at")]
    public DateTimeOffset? CompletedAt { get; set; }
}

public class ActionWorkflowRunList
{
    [JsonPropertyName("total_count")]
    public long TotalCount { get; set; }

    [JsonPropertyName("workflow_runs")]
    public ActionWorkflowRun[] WorkflowRuns { get; set; } = [];
}
