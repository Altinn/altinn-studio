using System.Diagnostics.CodeAnalysis;
using System.Text.Json;
using System.Xml;
using System.Xml.Linq;
using Altinn.Studio.AppConfig.Documents.Text;
using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig.Parsers;

internal static class SourceParse
{
    public static bool TryJson(AppModelBuilder app, string file, byte[] data, [NotNullWhen(true)] out JsonDocument? doc)
    {
        try
        {
            doc = JsonDocument.Parse(data);
            return true;
        }
        catch (JsonException ex)
        {
            doc = null;
            var line = (int)((ex.LineNumber ?? 0) + 1);
            var col = (int)((ex.BytePositionInLine ?? 0) + 1);
            app.ParseErrors.Add(new ParseError(file, Clean(ex.Message), new SourceSpan(file, "", line, col)));
            return false;
        }
    }

    public static bool TryXml(AppModelBuilder app, string file, byte[] data, [NotNullWhen(true)] out XDocument? doc)
    {
        try
        {
            using var ms = new MemoryStream(data);
            doc = XDocument.Load(ms, LoadOptions.SetLineInfo);
            return true;
        }
        catch (XmlException ex)
        {
            doc = null;
            var (line, col) = (ex.LineNumber, ex.LinePosition);
            if (line >= 1)
            {
                var lineStarts = Spans.LineStarts(data);
                (line, col) = Spans.LineColOf(lineStarts, XmlPositions.ByteOffset(data, lineStarts, line, col));
            }
            app.ParseErrors.Add(new ParseError(file, ex.Message, new SourceSpan(file, "", line, col)));
            return false;
        }
    }

    private static string Clean(string message)
    {
        var cut = message.Length;
        foreach (var marker in new[] { " Path:", " LineNumber:" })
        {
            var i = message.IndexOf(marker, StringComparison.Ordinal);
            if (i >= 0 && i < cut)
                cut = i;
        }
        return message[..cut].TrimEnd();
    }
}
