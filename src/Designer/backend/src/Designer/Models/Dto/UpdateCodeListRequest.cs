#nullable enable
using System;
using System.Collections.Generic;
using System.Linq;

namespace Altinn.Studio.Designer.Models.Dto;

public sealed record UpdateCodeListRequest(List<CodeListWrapper> CodeListWrappers, string BaseCommitSha, string? CommitMessage = null)
{
    public bool Equals(UpdateCodeListRequest? other)
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

        if (other.CodeListWrappers.SequenceEqual(CodeListWrappers) is false)
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

        foreach (CodeListWrapper wrapper in CodeListWrappers)
        {
            hash.Add(wrapper);
        }

        return hash.ToHashCode();
    }
}
