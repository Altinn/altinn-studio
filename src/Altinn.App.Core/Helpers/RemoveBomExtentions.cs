namespace Altinn.App.Core.Helpers;

internal static class RemoveBomExtentions
{
    private static readonly byte[] _utf8bom = [0xEF, 0xBB, 0xBF];

    internal static ReadOnlySpan<byte> RemoveBom(this byte[] bytes)
    {
        // Remove UTF8 BOM (if present)
        if (bytes.AsSpan().StartsWith(_utf8bom))
        {
            return bytes.AsSpan().Slice(_utf8bom.Length);
        }

        return bytes;
    }
}
