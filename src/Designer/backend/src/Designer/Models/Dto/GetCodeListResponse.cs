using System;
using System.Collections.Generic;
using System.Linq;

namespace Altinn.Studio.Designer.Models.Dto;

public sealed record GetCodeListResponse(List<CodeListWrapper> CodeListWrappers, string CommitSha)
{
    public bool Equals(GetCodeListResponse? other)
    {
        if (other is null)
        {
            return false;
        }

        if (Equals(other.CommitSha, CommitSha) is false)
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
        hash.Add(CommitSha);

        if (CodeListWrappers is not null)
        {
            foreach (CodeListWrapper wrapper in CodeListWrappers)
            {
                hash.Add(wrapper);
            }
        }
        return hash.ToHashCode();
    }
}
