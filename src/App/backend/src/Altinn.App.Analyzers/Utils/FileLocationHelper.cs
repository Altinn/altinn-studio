using System.Diagnostics;
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
