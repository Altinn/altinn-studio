using System.Text;
using System.Xml;
using Altinn.Studio.AppConfig.Documents.Text;

namespace Altinn.Studio.AppConfig.Parsers;

internal static class XmlPositions
{
    public static (int Line, int Col) LineCol(IXmlLineInfo? info, byte[] data, int[] lineStarts)
    {
        if (info?.HasLineInfo() != true)
            return (0, 0);
        return Spans.LineColOf(lineStarts, ByteOffset(data, lineStarts, info.LineNumber, info.LinePosition));
    }

    public static int ByteOffset(byte[] data, int[] lineStarts, int line, int charCol)
    {
        if (line < 1 || line > lineStarts.Length)
            return data.Length;
        var lineStart = lineStarts[line - 1];
        var lineEnd = line < lineStarts.Length ? lineStarts[line] : data.Length;
        var lineBytes = data.AsSpan(lineStart, lineEnd - lineStart);
        if (Ascii.IsValid(lineBytes))
            return lineStart + Math.Clamp(charCol - 1, 0, lineBytes.Length);
        var text = Encoding.UTF8.GetString(lineBytes);
        var take = Math.Clamp(charCol - 1, 0, text.Length);
        return lineStart + Encoding.UTF8.GetByteCount(text.AsSpan(0, take));
    }
}
