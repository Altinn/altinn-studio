#nullable enable
using System;
using System.Collections.Generic;
using System.Linq;

namespace Altinn.Studio.Designer.Models;

public sealed record SharedCodeList(List<Code> Codes, string Version, CodeListSource? Source, List<string>? TagNames)
{
    public bool Equals(SharedCodeList? other)
    {
        if (other is null)
        {
            return false;
        }

        if (other.Codes.SequenceEqual(Codes) is false)
        {
            return false;
        }

        if (Equals(other.Version, Version) is false)
        {
            return false;
        }

        if ((other.Source is null && Source is not null) ||
            (other.Source is not null && Source is null))
        {
            return false;
        }

        if (other.Source is not null && Source is not null &&
            Equals(other.Source, Source) is false)
        {
            return false;
        }


        if ((other.TagNames is null && TagNames is not null) ||
            (other.TagNames is not null && TagNames is null))
        {
            return false;
        }

        if (other.TagNames is not null && TagNames is not null &&
            other.TagNames.SequenceEqual(TagNames) is false)
        {
            return false;
        }
        return true;
    }

    public override int GetHashCode()
    {
        var hash = new HashCode();

        foreach (Code code in Codes)
        {
            hash.Add(code);
        }

        hash.Add(Version);
        hash.Add(Source);

        if (TagNames is not null)
        {
            foreach (string tag in TagNames)
            {
                hash.Add(tag);
            }
        }
        return hash.ToHashCode();
    }
}
