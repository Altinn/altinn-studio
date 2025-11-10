using System;
using System.Collections.Generic;
using System.Linq;
using Altinn.Studio.Designer.Helpers.Extensions;

namespace Altinn.Studio.Designer.Models.Dto;

/// <summary>
/// Update library files in gitea.
/// </summary>
/// <param name="Files">Key is file path, Value is file content.</param>
/// <param name="BaseCommitSha">The commit sha the user was checkout on.</param>
/// <param name="CommitMessage">The commit message.</param>
public sealed record UpdateSharedResourceRequest(Dictionary<string, string> Files, string BaseCommitSha, string? CommitMessage = null)
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

        if (Files.IsEqualTo(other.Files) is false)
        {
            return false;
        }
        return true;
    }

    public override int GetHashCode()
    {
        var hash = new HashCode();
        hash.Add(BaseCommitSha, StringComparer.Ordinal);
        hash.Add(CommitMessage, StringComparer.Ordinal);

        foreach (KeyValuePair<string, string> kvp in Files.OrderBy(k => k.Key, StringComparer.Ordinal))
        {
            hash.Add(kvp.Key, StringComparer.Ordinal);
            hash.Add(kvp.Value, StringComparer.Ordinal);
        }

        return hash.ToHashCode();
    }
}
