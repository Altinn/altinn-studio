#nullable enable
using System;
using System.Collections.Generic;
using System.Linq;
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
        return HashCode.Combine(Author, Branch, Committer, Files.GetHashCode(), Message);
    }
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

    public override bool Equals(object? obj)
    {
        Identity? other = obj as Identity;
        if (other is null)
        {
            return false;
        }
        if (Equals(other.Name, Name) is false)
        {
            return false;
        }
        if (Equals(other.Email, Email) is false)
        {
            return false;
        }
        return true;
    }
    public override int GetHashCode()
    {
        return HashCode.Combine(Name, Email);
    }
}
