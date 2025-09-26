#nullable enable

using System;
using System.Collections.Generic;
using System.Linq;
using Altinn.Studio.Designer.Models.Dto;

namespace Altinn.Studio.Designer.Models;

public sealed record FileContents(List<CodeListWrapper> CodeListWrappers, Dictionary<string, string> FileMetadata)
{
    public bool Equals(FileContents? other)
    {
        if (other is null)
        {
            return false;
        }

        if (other.CodeListWrappers.SequenceEqual(CodeListWrappers) is false)
        {
            return false;
        }

        if (other.FileMetadata.Count != FileMetadata.Count)
        {
            return false;
        }

        foreach (KeyValuePair<string, string> pair in other.FileMetadata.OrderBy(kv => kv.Key))
        {
            if (FileMetadata.TryGetValue(pair.Key, out string? value) is false || Equals(value, pair.Value) is false)
            {
                return false;
            }
        }
        return true;
    }

    public override int GetHashCode()
    {
        var hash = new HashCode();

        if (CodeListWrappers is not null)
        {
            foreach (CodeListWrapper wrapper in CodeListWrappers)
            {
                hash.Add(wrapper);
            }
        }

        if (FileMetadata is not null)
        {
            foreach (KeyValuePair<string, string> pair in FileMetadata)
            {
                hash.Add(pair.Key);
                hash.Add(pair.Value);
            }
        }
        return hash.ToHashCode();
    }
}
