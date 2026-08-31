using System.Text;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>
/// Strict UTF-8 decoding/encoding for app files the upgrade rewrites in place, preserving the
/// presence or absence of a byte order mark. Decoding is strict on purpose: a lossy decoder would
/// turn non-UTF-8 content (e.g. a legacy ISO-8859-1 policy) into U+FFFD replacement characters that
/// a rewrite would then silently persist. Callers should catch <see cref="DecoderFallbackException"/>
/// and skip the file with a warning instead.
/// </summary>
internal static class Utf8TextFile
{
    private static readonly UTF8Encoding _strictUtf8 = new(
        encoderShouldEmitUTF8Identifier: false,
        throwOnInvalidBytes: true
    );

    /// <summary>
    /// Decodes <paramref name="bytes"/> as UTF-8, returning the text (without BOM) and whether the
    /// content had a UTF-8 BOM. Throws <see cref="DecoderFallbackException"/> when the content is
    /// not valid UTF-8.
    /// </summary>
    public static (string Text, bool HadBom) Decode(byte[] bytes)
    {
        var hadBom = bytes.Length >= 3 && bytes[0] == 0xEF && bytes[1] == 0xBB && bytes[2] == 0xBF;
        var text = hadBom ? _strictUtf8.GetString(bytes, 3, bytes.Length - 3) : _strictUtf8.GetString(bytes);
        return (text, hadBom);
    }

    /// <summary>Writes <paramref name="text"/> as UTF-8, with a BOM iff <paramref name="withBom"/>.</summary>
    public static async Task Write(string path, string text, bool withBom)
    {
        var bytes = Encoding.UTF8.GetBytes(text);
        await File.WriteAllBytesAsync(path, withBom ? [0xEF, 0xBB, 0xBF, .. bytes] : bytes);
    }
}
