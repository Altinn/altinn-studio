using System;
using System.Collections.Generic;
using System.Linq;

namespace Altinn.Studio.Designer.Models;

public sealed record CodeList(List<Code> Codes, CodeListSource? Source, List<string>? TagNames)
{
    public bool Equals(CodeList? other)
    {
        if (other is null)
        {
            return false;
        }

        if (Equals(other.Source, Source) is false)
        {
            return false;
        }

        if (other.Codes.SequenceEqual(Codes) is false)
        {
            return false;
        }

        if (other.TagNames is null || TagNames is null)
        {
            if (other.TagNames != TagNames)
            {
                return false;
            }
            return true;
        }

        return other.TagNames.SequenceEqual(TagNames);
    }

    public override int GetHashCode()
    {
        var hash = new HashCode();

        foreach (Code code in Codes)
        {
            hash.Add(code);
        }

        hash.Add(Source);

        if (TagNames is not null)
        {
            foreach (string name in TagNames)
            {
                hash.Add(name, StringComparer.Ordinal);
            }
        }

        return hash.ToHashCode();
    }
}
