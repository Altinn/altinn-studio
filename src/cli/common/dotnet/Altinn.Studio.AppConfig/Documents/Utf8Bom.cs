using System.Diagnostics.CodeAnalysis;

namespace Altinn.Studio.AppConfig.Documents;

internal static class Utf8Bom
{
    public static bool Has(ReadOnlySpan<byte> data) =>
        data.Length >= 3 && data[0] == 0xEF && data[1] == 0xBB && data[2] == 0xBF;

    [return: NotNullIfNotNull(nameof(data))]
    public static byte[]? Strip(byte[]? data) => data is not null && Has(data) ? data[3..] : data;

    public static byte[] Prepend(byte[] data)
    {
        var result = new byte[data.Length + 3];
        result[0] = 0xEF;
        result[1] = 0xBB;
        result[2] = 0xBF;
        data.CopyTo(result, 3);
        return result;
    }
}
