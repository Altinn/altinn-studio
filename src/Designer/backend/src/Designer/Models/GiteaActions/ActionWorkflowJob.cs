using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models.GiteaActions;

public class ActionWorkflowJob
{
    public long Id { get; set; }

    public string? Name { get; set; }

    public string? Status { get; set; }

    public string? Conclusion { get; set; }

    [JsonPropertyName("html_url")]
    public string? HtmlUrl { get; set; }

    public ActionWorkflowStep[] Steps { get; set; } = [];
}

public class ActionWorkflowStep
{
    public string? Name { get; set; }

    public string? Status { get; set; }

    public string? Conclusion { get; set; }
}

public class ActionWorkflowJobList
{
    [JsonPropertyName("total_count")]
    public long TotalCount { get; set; }

    public ActionWorkflowJob[] Jobs { get; set; } = [];
}
