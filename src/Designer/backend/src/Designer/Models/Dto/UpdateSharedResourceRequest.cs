using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;

namespace Altinn.Studio.Designer.Models.Dto;

/// <summary>
/// Update library files in gitea.
/// </summary>
/// <param name="Files">Key is file path, Value is file content.</param>
/// <param name="BaseCommitSha">The commit sha the user was checkout on.</param>
/// <param name="CommitMessage">The commit message.</param>
public sealed record UpdateSharedResourceRequest(Dictionary<string, JsonElement> Files, string BaseCommitSha, string? CommitMessage = null)
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

        foreach (KeyValuePair<string, JsonElement> kvp in Files)
        {
            if (other.Files.TryGetValue(kvp.Key, out JsonElement otherValue) is false) { return false; }

            if (string.Equals(kvp.Value.GetRawText(), otherValue.GetRawText(), StringComparison.Ordinal) is false)
            {
                return false;
            }
        }
        return true;
    }

    public override int GetHashCode()
    {
        var hash = new HashCode();
        hash.Add(BaseCommitSha, StringComparer.Ordinal);
        hash.Add(CommitMessage, StringComparer.Ordinal);

        foreach (KeyValuePair<string, JsonElement> kv in Files.OrderBy(x => x.Key, StringComparer.Ordinal))
        {
            hash.Add(kv.Key, StringComparer.Ordinal);
            hash.Add(kv.Value.GetRawText(), StringComparer.Ordinal);
        }

        return hash.ToHashCode();
    }
}
