using System.Globalization;
using System.Text;
using System.Text.Json;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>
/// Retains comments outside the mutable JSON tree. Comments follow their next token's JSON path;
/// if that property was removed or renamed, they remain at the end of its nearest surviving container.
/// Only JSON tokens are inspected, so comment-like text inside string values is left alone.
/// </summary>
internal static class LayoutJsonComments
{
    private static readonly TokenPath _rootPath = new(null, "");

    public static string Restore(string original, string updated)
    {
        var source = ReadTokens(original);
        if (!source.Any(token => token.Comment is not null))
            return updated;

        var bytes = Encoding.UTF8.GetBytes(updated);
        var targets = ReadTokens(updated).ToDictionary(token => token.Anchor, token => token.Offset);
        var insertions = new SortedDictionary<int, List<string>>();
        for (var index = 0; index < source.Count; index++)
        {
            if (source[index].Comment is not { } comment)
                continue;

            var next = index + 1;
            while (next < source.Count && source[next].Comment is not null)
                next++;
            var offset = bytes.Length;
            if (next < source.Count)
            {
                var anchor = source[next].Anchor;
                while (!targets.TryGetValue(anchor, out offset))
                {
                    if (anchor.Path.Parent is not { } parent)
                    {
                        offset = bytes.Length;
                        break;
                    }
                    anchor = new Anchor(parent, "end");
                }
            }

            if (!insertions.TryGetValue(offset, out var comments))
                insertions[offset] = comments = [];
            comments.Add(comment);
        }

        var output = new StringBuilder();
        var previous = 0;
        foreach (var (offset, comments) in insertions)
        {
            output.Append(Encoding.UTF8.GetString(bytes.AsSpan(previous, offset - previous)));
            var lineStart = offset;
            while (lineStart > 0 && bytes[lineStart - 1] != '\n')
                lineStart--;
            var indentEnd = lineStart;
            while (indentEnd < offset && bytes[indentEnd] is (byte)' ' or (byte)'\t')
                indentEnd++;
            var indent = Encoding.UTF8.GetString(bytes.AsSpan(lineStart, indentEnd - lineStart));
            if (offset == bytes.Length)
                output.Append('\n');
            // Terminate line comments before the following JSON token and retain its indentation.
            foreach (var comment in comments)
                output.Append(comment).Append('\n').Append(indent);
            previous = offset;
        }
        output.Append(Encoding.UTF8.GetString(bytes.AsSpan(previous)));
        return output.ToString();
    }

    private static List<Token> ReadTokens(string text)
    {
        var bytes = Encoding.UTF8.GetBytes(text);
        var reader = new Utf8JsonReader(
            bytes,
            new JsonReaderOptions { CommentHandling = JsonCommentHandling.Allow, AllowTrailingCommas = true }
        );
        var tokens = new List<Token>();
        var containers = new Stack<Container>();
        while (reader.Read())
        {
            var offset = checked((int)reader.TokenStartIndex);
            if (reader.TokenType == JsonTokenType.Comment)
            {
                tokens.Add(
                    new Token(
                        default,
                        offset,
                        Encoding.UTF8.GetString(bytes.AsSpan(offset, checked((int)reader.BytesConsumed) - offset))
                    )
                );
                continue;
            }

            if (reader.TokenType == JsonTokenType.PropertyName)
            {
                var parent = containers.Peek();
                parent.Property = reader.GetString() ?? throw new JsonException("Property name is missing.");
                tokens.Add(new Token(new Anchor(new TokenPath(parent.Path, parent.Property), "property"), offset));
                continue;
            }

            if (reader.TokenType is JsonTokenType.EndObject or JsonTokenType.EndArray)
            {
                tokens.Add(new Token(new Anchor(containers.Pop().Path, "end"), offset));
                continue;
            }

            var path = _rootPath;
            if (containers.TryPeek(out var container))
                path = new TokenPath(
                    container.Path,
                    container.IsArray ? (container.Index++).ToString(CultureInfo.InvariantCulture) : container.Property
                );
            tokens.Add(new Token(new Anchor(path, "value"), offset));
            if (reader.TokenType is JsonTokenType.StartObject or JsonTokenType.StartArray)
                containers.Push(new Container(path, reader.TokenType == JsonTokenType.StartArray));
        }
        return tokens;
    }

    private sealed record TokenPath(TokenPath? Parent, string Segment);

    private readonly record struct Anchor(TokenPath Path, string Kind);

    private sealed record Token(Anchor Anchor, int Offset, string? Comment = null);

    private sealed class Container(TokenPath path, bool isArray)
    {
        public TokenPath Path { get; } = path;
        public bool IsArray { get; } = isArray;
        public string Property { get; set; } = "";
        public int Index { get; set; }
    }
}
