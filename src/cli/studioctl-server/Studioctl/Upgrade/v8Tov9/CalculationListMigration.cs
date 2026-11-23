using System.Text;
using System.Text.Json;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>
/// Converts <c>calculations</c> in <c>models/*.calculation.json</c> from an object keyed by field to the list of
/// <c>{ "field", "expression" }</c> items that v9 reads. A file is converted only when the result would load in v9;
/// otherwise it is left as written and reported as a to-do that says what to fix.
/// </summary>
/// <remarks>
/// Only the bytes around each calculation change, so comments, trailing commas and formatting stay as written.
/// Each <c>"field": { ...</c> becomes <c>{ "field": "field", ...</c>, with the whitespace that followed the brace.
/// Comments between the name and the brace stay in front of the new item.
/// </remarks>
internal static class CalculationListMigration
{
    private const string FileSuffix = ".calculation.json";

    private static readonly JsonReaderOptions _readerOptions = new()
    {
        CommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true,
    };

    public static async Task<MigrationResult> Migrate(string projectFolder)
    {
        var appFolder = Path.Combine(projectFolder, "App");
        if (!Directory.Exists(appFolder))
            appFolder = projectFolder;
        var modelsFolder = Path.Combine(appFolder, "models");
        if (!Directory.Exists(modelsFolder))
            return new MigrationResult();

        var messages = new List<UpgradeMessage>();
        // The same files the app reads: directly in models/, with the suffix in this exact case.
        var files = Directory
            .EnumerateFiles(modelsFolder)
            .Where(static file =>
                Path.GetFileName(file) is var name
                && name.Length > FileSuffix.Length
                && name.EndsWith(FileSuffix, StringComparison.Ordinal)
            )
            .Order(StringComparer.Ordinal);
        foreach (var file in files)
        {
            var displayPath = Path.GetRelativePath(appFolder, file).Replace(Path.DirectorySeparatorChar, '/');
            var json = await File.ReadAllBytesAsync(file);
            Conversion conversion;
            try
            {
                conversion = Convert(json);
            }
            catch (JsonException ex)
            {
                messages.Todo($"Fix {displayPath} by hand: it is not valid JSON. {ex.Message}");
                continue;
            }

            if (conversion.Problems.Count > 0)
            {
                messages.Todo(
                    $"Convert calculations in {displayPath} to a list of {{ \"field\", \"expression\" }} items: "
                        + string.Join("; ", conversion.Problems)
                        + ". Fix this and run the upgrade again, or convert the file by hand. "
                        + "v9 reads calculations only as that list."
                );
                continue;
            }

            if (conversion.Converted is null)
                continue;

            await File.WriteAllBytesAsync(file, conversion.Converted);
            messages.Ok($"Converted calculations in {displayPath} to a list of field and expression");
        }

        return new MigrationResult(messages);
    }

    /// <summary>
    /// The outcome for one file: the file with its calculations as a list, or null when they already are one, the
    /// file has none, or <paramref name="Problems"/> says why it was not converted.
    /// </summary>
    internal sealed record Conversion(byte[]? Converted, IReadOnlyList<string> Problems);

    /// <summary>
    /// Converts the file. Throws <see cref="JsonException"/> when it is not valid JSON.
    /// </summary>
    internal static Conversion Convert(byte[] json)
    {
        var bomLength = json.AsSpan().StartsWith(Encoding.UTF8.Preamble) ? Encoding.UTF8.Preamble.Length : 0;
        var reader = new Utf8JsonReader(json.AsSpan(bomLength), _readerOptions);
        var problems = new List<string>();
        if (!reader.Read() || reader.TokenType != JsonTokenType.StartObject)
        {
            problems.Add("the file is not a JSON object");
            return new Conversion(null, problems);
        }

        var edits = new List<Edit>();
        var calculationsCount = 0;
        while (reader.Read() && reader.TokenType == JsonTokenType.PropertyName)
        {
            // v9 reads property names regardless of case, so "Calculations" holds calculations too.
            var isCalculations = string.Equals(reader.GetString(), "calculations", StringComparison.OrdinalIgnoreCase);
            reader.Read();
            if (!isCalculations)
            {
                reader.Skip();
                continue;
            }

            calculationsCount++;
            switch (reader.TokenType)
            {
                case JsonTokenType.StartArray:
                    reader.Skip();
                    break;
                case JsonTokenType.StartObject:
                    CollectEdits(ref reader, json, bomLength, edits, problems);
                    break;
                case JsonTokenType.Null:
                    problems.Add("\"calculations\" is null, not an object keyed by field or a list");
                    break;
                default:
                    problems.Add("\"calculations\" is neither an object keyed by field nor a list");
                    reader.Skip();
                    break;
            }
        }

        // Read to the end, so a truncated file or trailing text is reported as invalid JSON.
        while (reader.Read())
        {
            // Nothing after the root object is read for its content.
        }

        if (calculationsCount > 1)
            problems.Add("\"calculations\" appears more than once");
        if (problems.Count > 0)
            return new Conversion(null, problems);
        if (edits.Count == 0)
            return new Conversion(null, problems);

        using var output = new MemoryStream();
        var offset = 0;
        foreach (var edit in edits)
        {
            output.Write(json, offset, edit.Start - offset);
            output.Write(edit.Replacement);
            offset = edit.Start + edit.Length;
        }
        output.Write(json, offset, json.Length - offset);
        return new Conversion(output.ToArray(), problems);
    }

    private static void CollectEdits(
        ref Utf8JsonReader reader,
        byte[] json,
        int bomLength,
        List<Edit> edits,
        List<string> problems
    )
    {
        edits.Add(new Edit(bomLength + (int)reader.TokenStartIndex, 1, "["u8.ToArray()));
        while (reader.Read() && reader.TokenType == JsonTokenType.PropertyName)
        {
            var nameStart = bomLength + (int)reader.TokenStartIndex;
            // The name as written, quotes and escapes included, so it is copied without re-encoding.
            var name = json.AsSpan(nameStart, reader.ValueSpan.Length + 2);
            var field = reader.GetString() ?? "";
            var quotedField = $"\"{field}\"";
            reader.Read();
            if (reader.TokenType != JsonTokenType.StartObject)
            {
                problems.Add($"the calculation for {quotedField} is not an object");
                reader.Skip();
                continue;
            }

            if (string.IsNullOrWhiteSpace(field))
                problems.Add($"the calculation for {quotedField} has an empty field name");

            // Remove the name, the colon and the whitespace after it. Only whitespace can sit between the name
            // and the colon, so a comment after the colon is kept, in front of the new item.
            var colonEnd = nameStart + name.Length;
            while (json[colonEnd] != (byte)':')
                colonEnd++;
            colonEnd++;
            var nameEnd = SkipWhitespace(json, colonEnd);
            edits.Add(new Edit(nameStart, nameEnd - nameStart, []));

            var braceStart = bomLength + (int)reader.TokenStartIndex;
            var whitespaceEnd = SkipWhitespace(json, braceStart + 1);
            var whitespace = json.AsSpan(braceStart + 1, whitespaceEnd - braceStart - 1);
            edits.Add(
                new Edit(
                    braceStart,
                    whitespaceEnd - braceStart,
                    [(byte)'{', .. whitespace, .. "\"field\": "u8, .. name, (byte)',', .. whitespace]
                )
            );

            var hasExpression = false;
            var hasField = false;
            while (reader.Read() && reader.TokenType == JsonTokenType.PropertyName)
            {
                var property = reader.GetString();
                hasExpression |= string.Equals(property, "expression", StringComparison.OrdinalIgnoreCase);
                hasField |= string.Equals(property, "field", StringComparison.OrdinalIgnoreCase);
                reader.Read();
                reader.Skip();
            }

            if (!hasExpression)
                problems.Add($"the calculation for {quotedField} has no \"expression\"");
            if (hasField)
                problems.Add(
                    $"the calculation for {quotedField} has a \"field\" property, which v9 reads as its field"
                );
        }

        edits.Add(new Edit(bomLength + (int)reader.TokenStartIndex, 1, "]"u8.ToArray()));
    }

    private static int SkipWhitespace(byte[] json, int index)
    {
        while (index < json.Length && json[index] is (byte)' ' or (byte)'\t' or (byte)'\r' or (byte)'\n')
            index++;
        return index;
    }

    private sealed record Edit(int Start, int Length, byte[] Replacement);
}
