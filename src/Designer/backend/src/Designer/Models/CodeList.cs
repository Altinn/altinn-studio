#nullable enable
using System;
using System.Collections.Generic;
using System.Linq;

namespace Altinn.Studio.Designer.Models;

public class CodeList
{
    public string SourceName { get; set; } = string.Empty;
    public required List<Code> Codes { get; set; }
    public string Version { get; set; } = string.Empty;

    public override bool Equals(object? obj)
    {
        CodeList? other = obj as CodeList;
        if (other is null)
        {
            return false;
        }

        if (!Equals(other.SourceName, SourceName))
        {
            return false;
        }

        if (!Equals(other.Version, Version))
        {
            return false;
        }

        return other.Codes.SequenceEqual(Codes);
    }

    public override int GetHashCode()
    {
        return HashCode.Combine(SourceName, Codes, Version);
    }
}

