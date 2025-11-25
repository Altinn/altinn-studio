using System;
using System.Collections.Generic;
using System.Linq;

namespace Altinn.Studio.Designer.Models.Dto;

/// <summary>
/// Update library files in gitea.
/// </summary>
/// <param name="Files">A list of <see cref="FileMetadata"/>.</param>
/// <param name="BaseCommitSha">The commit sha the user was checked out on.</param>
/// <param name="CommitMessage">The commit message.</param>
public sealed record UpdateSharedResourceRequest(List<FileMetadata> Files, string BaseCommitSha, string? CommitMessage = null)
{
    public bool Equals(UpdateSharedResourceRequest? other)
    {
        if (other is null)
        {
            return false;
        }

        if (Equals(other.BaseCommitSha, BaseCommitSha) is false)
        {
            return false;
        }

        if (Equals(other.CommitMessage, CommitMessage) is false)
        {
            return false;
        }

        if (Files.SequenceEqual(other.Files) is false)
        {
            return false;
        }
        return true;
    }

    public override int GetHashCode()
    {
        var hash = new HashCode();
        hash.Add(BaseCommitSha, StringComparer.Ordinal);
        hash.Add(CommitMessage ?? string.Empty, StringComparer.Ordinal);

        foreach (FileMetadata fileMetadata in Files)
        {
            hash.Add(fileMetadata);
        }

        return hash.ToHashCode();
    }
}
