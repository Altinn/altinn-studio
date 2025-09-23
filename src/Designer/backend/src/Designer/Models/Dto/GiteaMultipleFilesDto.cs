#nullable enable
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models.Dto;

/// <summary>
/// Main request model for Git file operations
/// </summary>
public sealed class GiteaMultipleFilesDto
{
    /// <summary>
    /// Identity for the author
    /// </summary>
    [JsonPropertyName("author")]
    public GiteaIdentity? Author { get; set; }

    /// <summary>
    /// Branch (optional) to base this file from. If not given, the default branch is used
    /// </summary>
    [JsonPropertyName("branch")]
    public string? Branch { get; set; }

    /// <summary>
    /// Identity for the committer
    /// </summary>
    [JsonPropertyName("committer")]
    public GiteaIdentity? Committer { get; set; }

    /// <summary>
    /// List of file operations
    /// </summary>
    [JsonPropertyName("files")]
    public List<FileOperationContext> Files { get; set; } = [];

    /// <summary>
    /// Message (optional) for the commit of this file. If not supplied, a default message will be used
    /// </summary>
    [JsonPropertyName("message")]
    public string? Message { get; set; }

    public override bool Equals(object? obj)
    {
        GiteaMultipleFilesDto? other = obj as GiteaMultipleFilesDto;
        if (other is null)
        {
            return false;
        }

        if (Equals(other.Author, Author) is false)
        {
            return false;
        }

        if (Equals(other.Branch, Branch) is false)
        {
            return false;
        }

        if (Equals(other.Committer, Committer) is false)
        {
            return false;
        }

        if (other.Files.SequenceEqual(Files) is false)
        {
            return false;
        }

        if (Equals(other.Message, Message) is false)
        {
            return false;
        }
        return true;
    }

    public override int GetHashCode()
    {
        var hash = new HashCode();
        hash.Add(Author);
        hash.Add(Committer);
        hash.Add(Branch, StringComparer.Ordinal);
        hash.Add(Message, StringComparer.Ordinal);
        foreach (FileOperationContext file in Files)
        {
            hash.Add(file);
        }
        return hash.ToHashCode();
    }
}
