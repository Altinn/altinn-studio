#nullable enable
using System;
using System.Collections.Generic;
using System.Linq;

namespace Altinn.Studio.Designer.Models.Dto;

/// <summary>
/// Main request model for Git file operations
/// </summary>
public sealed record GiteaMultipleFilesDto(GiteaIdentity? Author, GiteaIdentity? Committer, List<FileOperationContext> Files, string? Branch = null, string? Message = null)
{
    public bool Equals(GiteaMultipleFilesDto? other)
    {
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
