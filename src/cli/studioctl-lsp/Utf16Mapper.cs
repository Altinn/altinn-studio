using System.Text;

namespace Altinn.Studio.AppConfigLsp;

/// <summary>
/// Converts between the engine's column convention (UTF-8 <em>byte</em> offsets, 1-based) and
/// the LSP's (UTF-16 <em>code-unit</em> offsets, 0-based) for one document. They diverge the
/// moment a line contains a non-ASCII character — ubiquitous in Norwegian text (æ/ø/å) — so
/// every position crossing the LSP boundary must be converted using the document's bytes.
///
/// The LSP defaults to UTF-16 position encoding; this server converts at the boundary rather
/// than negotiating an encoding, so it works against every client.
/// </summary>
internal sealed class Utf16Mapper
{
    private readonly byte[] _bytes;
    private readonly int[] _lineStarts; // byte offset where each 0-based line begins

    public Utf16Mapper(byte[] bytes)
    {
        _bytes = bytes;
        var starts = new List<int> { 0 };
        for (var i = 0; i < bytes.Length; i++)
            if (bytes[i] == (byte)'\n')
                starts.Add(i + 1);
        _lineStarts = starts.ToArray();
    }

    /// <summary>Engine (1-based line, 1-based byte column) → 0-based UTF-16 character within the line.</summary>
    public int ToUtf16Character(int line1, int byteColumn1)
    {
        var li = line1 - 1;
        if (byteColumn1 <= 1 || li < 0 || li >= _lineStarts.Length)
            return Math.Max(0, byteColumn1 - 1);
        var start = _lineStarts[li];
        var byteCount = Math.Min(byteColumn1 - 1, _bytes.Length - start);
        if (byteCount <= 0)
            return 0;
        // UTF-16 code units = the .NET string length of those bytes.
        return Encoding.UTF8.GetString(_bytes, start, byteCount).Length;
    }

    /// <summary>0-based LSP (line, UTF-16 character) → engine 1-based byte column within the line.</summary>
    public int ToByteColumn(int line0, int character0)
    {
        if (line0 < 0 || line0 >= _lineStarts.Length || character0 <= 0)
            return Math.Max(1, character0 + 1);
        var start = _lineStarts[line0];
        var end = line0 + 1 < _lineStarts.Length ? _lineStarts[line0 + 1] : _bytes.Length;
        var line = Encoding.UTF8.GetString(_bytes, start, end - start);
        var units = Math.Min(character0, line.Length);
        // Bytes occupied by the first `units` UTF-16 code units → byte offset → 1-based column.
        return Encoding.UTF8.GetByteCount(line[..units]) + 1;
    }
}
