using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>
/// Removes a property with a value of any kind, such as a whole section, from the app's appsettings files. Unlike
/// <see cref="AppSettingsKeyRemoval"/>, the property may span several lines: its text is found with a JSON reader, so
/// formatting and comments elsewhere in the file are kept. The comma that separated it from its neighbors goes with
/// it, and so do the lines it leaves empty. The edit is kept only when the file then holds the same configuration
/// without the property. Names are matched case-insensitively, as configuration keys are.
/// </summary>
internal static class AppSettingsPropertyRemoval
{
    private static readonly JsonDocumentOptions _documentOptions = new()
    {
        AllowTrailingCommas = true,
        CommentHandling = JsonCommentHandling.Skip,
        // Fail the parse instead of the first lookup, which throws an ArgumentException rather than a JsonException.
        AllowDuplicateProperties = false,
    };

    private static readonly JsonReaderOptions _readerOptions = new()
    {
        AllowTrailingCommas = true,
        CommentHandling = JsonCommentHandling.Allow,
    };

    /// <param name="appFolder">The folder with the app's appsettings files</param>
    /// <param name="path">The property's path from the root object, such as <c>["Logging", "ApplicationInsights"]</c></param>
    /// <param name="removed">Reports a removal, given the file name and the value the property had</param>
    /// <param name="notRemoved">Reports a property that could not be removed automatically, given the file name</param>
    public static async Task<MigrationResult> Migrate(
        string appFolder,
        IReadOnlyList<string> path,
        Action<List<UpgradeMessage>, string, JsonNode?> removed,
        Action<List<UpgradeMessage>, string> notRemoved
    )
    {
        var messages = new List<UpgradeMessage>();
        foreach (var file in Directory.EnumerateFiles(appFolder, "appsettings*.json").Order(StringComparer.Ordinal))
        {
            string text;
            bool hadBom;
            try
            {
                (text, hadBom) = Utf8TextFile.Decode(await File.ReadAllBytesAsync(file));
            }
            catch (DecoderFallbackException)
            {
                continue; // Not UTF-8, so not ours to rewrite.
            }

            var name = Path.GetFileName(file);
            switch (Without(text, path))
            {
                case Lookup.Absent:
                    continue;
                case Lookup.Ambiguous:
                    notRemoved(messages, name);
                    continue;
                case Lookup.Found(var expected, var value):
                    if (Remove(text, path, expected) is { } migrated)
                    {
                        await Utf8TextFile.Write(file, migrated, hadBom);
                        removed(messages, name, value);
                    }
                    else
                    {
                        notRemoved(messages, name);
                    }
                    continue;
            }
        }

        return new MigrationResult(messages);
    }

    private abstract record Lookup
    {
        public sealed record Absent : Lookup;

        /// <summary>The property is there under more than one spelling, which configuration merges.</summary>
        public sealed record Ambiguous : Lookup;

        public sealed record Found(JsonNode? Expected, JsonNode? Value) : Lookup;
    }

    /// <summary>The file's configuration without the property and the value it had.</summary>
    private static Lookup Without(string text, IReadOnlyList<string> path)
    {
        JsonNode? root;
        try
        {
            root = JsonNode.Parse(text, documentOptions: _documentOptions);
        }
        catch (JsonException)
        {
            return new Lookup.Absent();
        }

        var parent = root as JsonObject;
        for (var i = 0; i < path.Count - 1 && parent is not null; i++)
        {
            parent =
                parent.FirstOrDefault(p => p.Key.Equals(path[i], StringComparison.OrdinalIgnoreCase)).Value
                as JsonObject;
        }

        var keys = parent
            ?.Select(p => p.Key)
            .Where(k => k.Equals(path[^1], StringComparison.OrdinalIgnoreCase))
            .ToList();
        if (parent is null || keys is null || keys.Count == 0)
            return new Lookup.Absent();
        if (keys.Count > 1)
            return new Lookup.Ambiguous();

        var value = parent[keys[0]];
        parent.Remove(keys[0]);
        return new Lookup.Found(root, value);
    }

    /// <summary>A token's span in the file, in bytes.</summary>
    private readonly record struct Token(JsonTokenType Type, int Start, int End);

    /// <summary>The file without the property's text, or null when that does not give the expected configuration.</summary>
    private static string? Remove(string text, IReadOnlyList<string> path, JsonNode? expected)
    {
        var bytes = Encoding.UTF8.GetBytes(text);
        if (Find(bytes, path) is not (var name, var valueEnd, var before, var after))
            return null;

        // Byte offsets to character offsets.
        int Chars(int byteOffset) => Encoding.UTF8.GetCharCount(bytes, 0, byteOffset);

        // The separating comma is in the gap after the value when another property follows, otherwise in the gap
        // before the name. Gaps hold only whitespace, commas and comments, and the comments are known tokens.
        var start = Chars(name);
        var end = Chars(valueEnd);
        int? commaBefore = null;
        if (CommaIn(bytes, after) is { } comma)
            end = Chars(comma + 1);
        else if (CommaIn(bytes, before) is { } previous)
            commaBefore = Chars(previous);

        var builder = new StringBuilder(text);
        var lineStart = text.LastIndexOf('\n', Math.Max(start - 1, 0)) + 1;
        var lineEnd = text.IndexOf('\n', end);
        var restOfLine = lineEnd < 0 ? text[end..] : text[end..lineEnd];
        if (string.IsNullOrWhiteSpace(text[lineStart..start]) && string.IsNullOrWhiteSpace(restOfLine))
        {
            // The property had its lines to itself: they go, line break included.
            builder.Remove(lineStart, (lineEnd < 0 ? text.Length : lineEnd + 1) - lineStart);
        }
        else
        {
            // It shares a line: remove it with the blanks that followed it on that line.
            var trailing = 0;
            while (end + trailing < text.Length && text[end + trailing] is ' ' or '\t')
                trailing++;
            builder.Remove(start, end - start + trailing);
        }

        if (commaBefore is { } index)
            builder.Remove(index, 1);

        var candidate = builder.ToString();
        try
        {
            return JsonNode.DeepEquals(JsonNode.Parse(candidate, documentOptions: _documentOptions), expected)
                ? candidate
                : null;
        }
        catch (JsonException)
        {
            return null;
        }
    }

    /// <summary>The bytes between two tokens that are not comments, with the comments in them.</summary>
    private sealed record Gap(int From, int Until, IReadOnlyList<Token> Comments);

    /// <summary>Where the property is: its name's start, its value's end, and the gaps on either side.</summary>
    private sealed record Location(int Name, int ValueEnd, Gap Before, Gap After);

    private static Location? Find(byte[] bytes, IReadOnlyList<string> path)
    {
        var reader = new Utf8JsonReader(bytes, _readerOptions);
        // The property names on the way down; null for an array, which never matches.
        var names = new List<string?>();
        string? pendingName = null;
        var previousEnd = 0;
        var commentsSincePrevious = new List<Token>();
        try
        {
            while (reader.Read())
            {
                var token = new Token(reader.TokenType, (int)reader.TokenStartIndex, (int)reader.BytesConsumed);
                switch (reader.TokenType)
                {
                    case JsonTokenType.Comment:
                        commentsSincePrevious.Add(token);
                        continue;
                    case JsonTokenType.PropertyName:
                        var propertyName = reader.GetString();
                        if (
                            names.Count == path.Count
                            && propertyName is not null
                            && propertyName.Equals(path[^1], StringComparison.OrdinalIgnoreCase)
                            && Matches(names, path)
                        )
                        {
                            var before = new Gap(previousEnd, token.Start, [.. commentsSincePrevious]);
                            reader.Read();
                            while (reader.TokenType == JsonTokenType.Comment)
                                reader.Read();
                            if (reader.TokenType is JsonTokenType.StartObject or JsonTokenType.StartArray)
                                reader.Skip();
                            var valueEnd = (int)reader.BytesConsumed;

                            var comments = new List<Token>();
                            while (reader.Read() && reader.TokenType == JsonTokenType.Comment)
                                comments.Add(
                                    new Token(reader.TokenType, (int)reader.TokenStartIndex, (int)reader.BytesConsumed)
                                );
                            var after = new Gap(valueEnd, (int)reader.TokenStartIndex, comments);
                            return new Location(token.Start, valueEnd, before, after);
                        }

                        pendingName = propertyName;
                        break;
                    case JsonTokenType.StartObject:
                        names.Add(names.Count == 0 ? "" : pendingName);
                        pendingName = null;
                        break;
                    case JsonTokenType.StartArray:
                        names.Add(null);
                        pendingName = null;
                        break;
                    case JsonTokenType.EndObject or JsonTokenType.EndArray:
                        names.RemoveAt(names.Count - 1);
                        break;
                    default:
                        pendingName = null;
                        break;
                }

                previousEnd = token.End;
                commentsSincePrevious.Clear();
            }
        }
        catch (JsonException)
        {
            return null;
        }

        return null;
    }

    /// <summary>Whether the objects the reader is in are the property's parents.</summary>
    private static bool Matches(List<string?> names, IReadOnlyList<string> path)
    {
        // names[0] is the root object; names[i] is the object under path[i - 1].
        for (var i = 1; i < names.Count; i++)
        {
            if (names[i] is not { } name || !name.Equals(path[i - 1], StringComparison.OrdinalIgnoreCase))
                return false;
        }

        return true;
    }

    /// <summary>The position of the comma in the gap, outside its comments.</summary>
    private static int? CommaIn(byte[] bytes, Gap gap)
    {
        var i = gap.From;
        while (i < gap.Until)
        {
            var position = i;
            if (gap.Comments.FirstOrDefault(c => c.Start <= position && position < c.End) is { End: > 0 } comment)
            {
                i = comment.End;
                continue;
            }

            if (bytes[i] == (byte)',')
                return i;
            i++;
        }

        return null;
    }
}
