#nullable enable
using System;
using System.Collections.Generic;

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

        if (other.SourceName != SourceName)
        {
            return false;
        }

        if (other.Version != Version)
        {
            return false;
        }

        if (other.Codes.Count != Codes.Count)
        {
            return false;
        }

        for (int i = 0; i < Codes.Count; i++)
        {
            if (!other.Codes[i].Equals(Codes[i]))
            {
                return false;
            }
        }

        return true;
    }

    public override int GetHashCode()
    {
        return HashCode.Combine(SourceName, Codes, Version);
    }
}

