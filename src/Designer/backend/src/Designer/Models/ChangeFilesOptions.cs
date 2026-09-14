using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models;

/// <summary>
/// Options for the Gitea endpoint that creates, updates, or deletes several files in one commit.
/// </summary>
public class ChangeFilesOptions
{
    public string? Branch { get; set; }

    [JsonPropertyName("new_branch")]
    public string? NewBranch { get; set; }

    public string? Message { get; set; }

    public List<ChangeFileOperation> Files { get; set; } = [];
}

public class ChangeFileOperation
{
    public string Operation { get; set; } = "create";

    public required string Path { get; set; }

    /// <summary>
    /// Base64-encoded file content.
    /// </summary>
    public string? Content { get; set; }

    public string? Sha { get; set; }
}
