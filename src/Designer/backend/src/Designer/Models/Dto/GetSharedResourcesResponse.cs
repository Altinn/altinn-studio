using System;
using System.Collections.Generic;
using System.Linq;

namespace Altinn.Studio.Designer.Models.Dto;

public sealed record GetSharedResourcesResponse(List<LibraryFile> Files, string CommitSha)
{
    public bool Equals(GetSharedResourcesResponse? other)
    {
        if (other is null)
        {
            return false;
        }

        if (other.Files.SequenceEqual(Files) is false)
        {
            return false;
        }

        return string.Equals(other.CommitSha, CommitSha, StringComparison.Ordinal);
    }

    public override int GetHashCode()
    {
        HashCode hash = new();

        foreach (LibraryFile file in Files)
        {
            hash.Add(file);
        }
        hash.Add(CommitSha);

        return hash.ToHashCode();
    }
}
