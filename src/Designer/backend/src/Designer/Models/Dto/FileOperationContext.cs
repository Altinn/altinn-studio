#nullable enable
using System;

namespace Altinn.Studio.Designer.Models.Dto;

public sealed record FileOperationContext(string Operation, string Path, string? Content = null, string? FromPath = null, string? Sha = null)
{
    public bool Equals(FileOperationContext? other)
    {
        if (other is null)
        {
            return false;
        }

        if (Equals(other.Content, Content) is false)
        {
            return false;
        }

        if (Equals(other.FromPath, FromPath) is false)
        {
            return false;
        }

        if (Equals(other.Operation, Operation) is false)
        {
            return false;
        }

        if (Equals(other.Path, Path) is false)
        {
            return false;
        }

        if (Equals(other.Sha, Sha) is false)
        {
            return false;
        }
        return true;
    }

    public override int GetHashCode()
    {
        return HashCode.Combine(Content, FromPath, Operation, Path, Sha);
    }
}
