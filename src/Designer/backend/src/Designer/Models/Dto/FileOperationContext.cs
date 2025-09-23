#nullable enable
using System;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models.Dto;


/// <summary>
/// Represents a single file change operation
/// </summary>
public sealed class FileOperationContext
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
    public required string Operation { get; set; }

    /// <summary>
    /// Path to the existing or new file
    /// </summary>
    [JsonPropertyName("path")]
    public required string Path { get; set; }

    /// <summary>
    /// SHA for the file that already exists, required for update or delete
    /// </summary>
    [JsonPropertyName("sha")]
    public string? Sha { get; set; }

    public override bool Equals(object? obj)
    {
        FileOperationContext? other = obj as FileOperationContext;
        if (other is null)
        {
            return false;
        }

        if (Equals(other.Content, Content) is false)
        {
            return false;
        }

        if (Equals(other.FromPath, FromPath) is false)
        {
            return false;
        }

        if (Equals(other.Operation, Operation) is false)
        {
            return false;
        }

        if (Equals(other.Path, Path) is false)
        {
            return false;
        }

        if (Equals(other.Sha, Sha) is false)
        {
            return false;
        }
        return true;
    }

    public override int GetHashCode()
    {
        return HashCode.Combine(Content, FromPath, Operation, Path, Sha);
    }
}
