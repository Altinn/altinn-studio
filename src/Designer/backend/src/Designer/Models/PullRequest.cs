using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models;

public class PullRequest
{
    public long Number { get; set; }

    public string? Title { get; set; }

    public string? Body { get; set; }

    public string? State { get; set; }

    public bool Merged { get; set; }

    [JsonPropertyName("html_url")]
    public string? HtmlUrl { get; set; }

    public PullRequestBranch? Head { get; set; }

    public PullRequestBranch? Base { get; set; }
}

public class PullRequestBranch
{
    public string? Ref { get; set; }

    public string? Sha { get; set; }
}
