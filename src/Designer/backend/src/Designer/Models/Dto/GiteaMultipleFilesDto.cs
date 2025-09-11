#nullable enable
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models.Dto;

/// <summary>
/// Main request model for Git file operations
/// </summary>
public class GiteaMultipleFilesDto
{
    /// <summary>
    /// Identity for the author
    /// </summary>
    [JsonPropertyName("author")]
    public Identity? Author { get; set; }

    /// <summary>
    /// Branch (optional) to base this file from. If not given, the default branch is used
    /// </summary>
    [JsonPropertyName("branch")]
    public string? Branch { get; set; }

    /// <summary>
    /// Identity for the committer
    /// </summary>
    [JsonPropertyName("committer")]
    public Identity? Committer { get; set; }

    /// <summary>
    /// List of file operations
    /// </summary>
    [JsonPropertyName("files")]
    public List<FileChangeContext> Files { get; set; } = new();

    /// <summary>
    /// Message (optional) for the commit of this file. If not supplied, a default message will be used
    /// </summary>
    [JsonPropertyName("message")]
    public string? Message { get; set; }
}

/// <summary>
/// Identity for a person's identity like an author or committer
/// </summary>
public class Identity
{
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("email")]
    public string? Email { get; set; }
}

/// <summary>
/// File operation types
/// </summary>
public enum FileOperation
{
    [JsonPropertyName("create")]
    Create,

    [JsonPropertyName("update")]
    Update,

    [JsonPropertyName("delete")]
    Delete
}

/// <summary>
/// Represents a single file change operation
/// </summary>
public class FileChangeContext
{
    /// <summary>
    /// New or updated file content, must be base64 encoded
    /// </summary>
    [JsonPropertyName("content")]
    public string? Content { get; set; }

    /// <summary>
    /// Old path of the file to move
    /// </summary>
    [JsonPropertyName("from_path")]
    public string? FromPath { get; set; }

    /// <summary>
    /// Indicates what to do with the file
    /// </summary>
    [JsonPropertyName("operation")]
    public FileOperation Operation { get; set; }

    /// <summary>
    /// Path to the existing or new file
    /// </summary>
    [JsonPropertyName("path")]
    public string Path { get; set; } = string.Empty;

    /// <summary>
    /// SHA for the file that already exists, required for update or delete
    /// </summary>
    [JsonPropertyName("sha")]
    public string? Sha { get; set; }
}

