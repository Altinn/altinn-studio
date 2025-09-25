namespace Altinn.App.Core.Helpers;

internal static class RemoveBomExtentions
{
    private static readonly byte[] _utf8bom = [0xEF, 0xBB, 0xBF];

    internal static ReadOnlySpan<byte> RemoveBom(this byte[] bytes)
    {
        return RemoveBom((ReadOnlySpan<byte>)bytes);
    }

    internal static ReadOnlySpan<byte> RemoveBom(this ReadOnlySpan<byte> bytes)
    {
        // Remove UTF8 BOM (if present)
        if (bytes.StartsWith(_utf8bom))
        {
            return bytes.Slice(_utf8bom.Length);
        }

        return bytes;
    }

    internal static ReadOnlyMemory<byte> RemoveBom(this ReadOnlyMemory<byte> bytes)
    {
        // Remove UTF8 BOM (if present)
        if (bytes.Span.StartsWith(_utf8bom))
        {
            return bytes.Slice(_utf8bom.Length);
        }

        return bytes;
    }

    internal static Memory<byte> RemoveBom(this Memory<byte> bytes)
    {
        // Remove UTF8 BOM (if present)
        if (bytes.Span.StartsWith(_utf8bom))
        {
            return bytes.Slice(_utf8bom.Length);
        }

        return bytes;
    }
}
