using System.Text;

namespace Altinn.Studio.AppConfig.Documents.Text;

internal static class Spans
{
    private static int OffsetOf(byte[] bytes, int line, int col)
    {
        int currentLine = 1;
        int currentCol = 1;
        for (int i = 0; i < bytes.Length; i++)
        {
            if (currentLine == line && currentCol == col)
                return i;
            if (bytes[i] == (byte)'\n')
            {
                currentLine++;
                currentCol = 1;
            }
            else
            {
                currentCol++;
            }
        }
        return bytes.Length;
    }

    public static string ReadOrEmpty(byte[] bytes, SourceSpan span)
    {
        if (span.Line <= 0 || span.Column <= 0 || span.EndLine <= 0 || span.EndColumn <= 0)
            return "";
        var start = OffsetOf(bytes, span.Line, span.Column);
        var end = OffsetOf(bytes, span.EndLine, span.EndColumn);
        if (end < start || end > bytes.Length)
            return "";
        return Encoding.UTF8.GetString(bytes, start, end - start);
    }

    public static int[] LineStarts(byte[] bytes)
    {
        var starts = new List<int> { 0 };
        for (int i = 0; i < bytes.Length; i++)
            if (bytes[i] == (byte)'\n')
                starts.Add(i + 1);
        return starts.ToArray();
    }

    public static (int Line, int Col) LineColOf(int[] lineStarts, int offset)
    {
        int lo = 0,
            hi = lineStarts.Length - 1,
            line = 0;
        while (lo <= hi)
        {
            int mid = (lo + hi) / 2;
            if (lineStarts[mid] <= offset)
            {
                line = mid;
                lo = mid + 1;
            }
            else
                hi = mid - 1;
        }
        return (line + 1, offset - lineStarts[line] + 1);
    }
}
