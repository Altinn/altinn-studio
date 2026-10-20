using System.Diagnostics;
using System.Xml;
using Microsoft.CodeAnalysis.Text;

namespace Altinn.App.Analyzers.Utils;

/// <summary>
/// Helper functions for creating <see cref="Location"/> instances from start and end char indexes.
/// </summary>
public static class FileLocationHelper
{
    public static Location GetLocation(AdditionalText file, int startIndex, int? endIndex)
    {
        var fileContent = file.GetText()?.ToString() ?? string.Empty;
        return GetLocation(fileContent.AsSpan(), file.Path, startIndex, endIndex);
    }

    public static Location GetLocation(ReadOnlySpan<char> fileContent, string filePath, int startIndex, int? endIndex)
    {
        // normalize and clamp
        var start = Math.Max(0, Math.Min(startIndex, fileContent.Length));
        var endRaw = endIndex ?? start;
        var end = Math.Max(start, Math.Min(endRaw, fileContent.Length));
        return Location.Create(
            filePath,
            new TextSpan(start, end - start),
            new LinePositionSpan(GetLinePosition(start, fileContent), GetLinePosition(end, fileContent))
        );
    }

    /// <summary>
    /// The location of an XML element's opening tag (e.g. <c>&lt;bpmn:serviceTask</c>), so an editor squiggles
    /// the element itself. <paramref name="lineInfo"/> comes from a document parsed with
    /// <see cref="System.Xml.Linq.LoadOptions.SetLineInfo"/>; without it, the location is the start of the file.
    /// </summary>
    public static Location GetXmlElementLocation(AdditionalText file, string content, IXmlLineInfo lineInfo)
    {
        if (!lineInfo.HasLineInfo())
        {
            return GetLocation(content.AsSpan(), file.Path, 0, null);
        }

        var offset = OffsetOf(content, lineInfo.LineNumber, lineInfo.LinePosition);
        if (offset < 0)
        {
            return GetLocation(content.AsSpan(), file.Path, 0, null);
        }

        // The reported position is the element name, one character past the '<' that opens the tag.
        var start = Math.Max(0, offset - 1);
        var end = start;
        while (end < content.Length && content[end] != '>' && !char.IsWhiteSpace(content[end]))
        {
            end++;
        }

        return GetLocation(content.AsSpan(), file.Path, start, end);
    }

    /// <summary>Translates a 1-based <see cref="IXmlLineInfo"/> position into a character offset.</summary>
    private static int OffsetOf(string content, int lineNumber, int linePosition)
    {
        var line = 1;
        var index = 0;
        while (line < lineNumber && index < content.Length)
        {
            if (content[index] == '\n')
            {
                line++;
            }

            index++;
        }

        return line == lineNumber ? Math.Min(content.Length, index + linePosition - 1) : -1;
    }

    private static LinePosition GetLinePosition(int position, ReadOnlySpan<char> fileContent)
    {
        Debug.Assert(position >= 0 && position <= fileContent.Length);
        var line = 0;
        var character = 0;
        for (var i = 0; i < position; i++)
        {
            if (fileContent[i] == '\n')
            {
                line++;
                character = -1;
            }
            character++;
        }
        return new LinePosition(line, character);
    }
}
