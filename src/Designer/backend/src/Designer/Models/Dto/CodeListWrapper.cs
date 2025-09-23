#nullable enable
using System;

namespace Altinn.Studio.Designer.Models.Dto;

public sealed record CodeListWrapper(string Title, CodeList? CodeList = null, bool? HasError = null)
{
    public bool Equals(CodeListWrapper? other)
    {
        if (other is null)
        {
            return false;
        }

        if (string.Equals(other.Title, Title) is false)
        {
            return false;
        }

        if (Equals(other.HasError, HasError) is false)
        {
            return false;
        }

        return Equals(other.CodeList, CodeList);
    }

    public override int GetHashCode()
    {
        return HashCode.Combine(Title, CodeList, HasError);
    }
}
