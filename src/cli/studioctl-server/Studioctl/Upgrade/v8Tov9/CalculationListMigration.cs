using System.Text;
using System.Text.Json;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>
/// Converts <c>calculations</c> in <c>models/*.calculation.json</c> from an object keyed by field to the list of
/// <c>{ "field", "expression" }</c> items that v9 reads. v9 rejects the old shape, so a file this cannot convert is
/// left as a to-do.
/// </summary>
/// <remarks>
/// Only the bytes around each calculation change, so comments, trailing commas and formatting stay as written.
/// Each <c>"field": { ...</c> becomes <c>{ "field": "field", ...</c>, with the whitespace that followed the brace.
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
        var files = Directory
            .EnumerateFiles(modelsFolder, "*" + FileSuffix, SearchOption.TopDirectoryOnly)
            .Order(StringComparer.Ordinal);
        foreach (var file in files)
        {
            var displayPath = Path.GetRelativePath(appFolder, file).Replace(Path.DirectorySeparatorChar, '/');
            var json = await File.ReadAllBytesAsync(file);
            byte[]? converted;
            try
            {
                converted = Convert(json);
            }
            catch (JsonException ex)
            {
                messages.Todo(
                    $"Convert calculations in {displayPath} to a list of {{ \"field\", \"expression\" }} items: "
                        + $"{ex.Message} v9 does not read calculations keyed by field."
                );
                continue;
            }

            if (converted is null)
                continue;

            await File.WriteAllBytesAsync(file, converted);
            messages.Ok($"Converted calculations in {displayPath} to a list of field and expression");
        }

        return new MigrationResult(messages);
    }

    /// <summary>
    /// The file with its calculations as a list, or null when they already are one or the file has none.
    /// Throws <see cref="JsonException"/> when the file cannot be read or a calculation is not an object.
    /// </summary>
    internal static byte[]? Convert(byte[] json)
    {
        var bomLength = json.AsSpan().StartsWith(Encoding.UTF8.Preamble) ? Encoding.UTF8.Preamble.Length : 0;
        var reader = new Utf8JsonReader(json.AsSpan(bomLength), _readerOptions);
        if (!reader.Read() || reader.TokenType != JsonTokenType.StartObject)
            throw new JsonException("The file is not a JSON object.");

        var edits = new List<Edit>();
        while (reader.Read() && reader.TokenType == JsonTokenType.PropertyName)
        {
            var isCalculations = reader.ValueTextEquals("calculations"u8);
            reader.Read();
            if (!isCalculations)
            {
                reader.Skip();
                continue;
            }

            switch (reader.TokenType)
            {
                case JsonTokenType.StartArray:
                    return null;
                case JsonTokenType.StartObject:
                    CollectEdits(ref reader, json, bomLength, edits);
                    break;
                default:
                    throw new JsonException("\"calculations\" is neither an object nor a list.");
            }
        }

        if (edits.Count == 0)
            return null;

        using var output = new MemoryStream();
        var offset = 0;
        foreach (var edit in edits)
        {
            output.Write(json, offset, edit.Start - offset);
            output.Write(edit.Replacement);
            offset = edit.Start + edit.Length;
        }
        output.Write(json, offset, json.Length - offset);
        return output.ToArray();
    }

    private static void CollectEdits(ref Utf8JsonReader reader, byte[] json, int bomLength, List<Edit> edits)
    {
        edits.Add(new Edit(bomLength + (int)reader.TokenStartIndex, 1, "["u8.ToArray()));
        while (reader.Read() && reader.TokenType == JsonTokenType.PropertyName)
        {
            var nameStart = bomLength + (int)reader.TokenStartIndex;
            // The name as written, quotes and escapes included, so it is copied without re-encoding.
            var name = json.AsSpan(nameStart, reader.ValueSpan.Length + 2);
            var field = reader.GetString();
            reader.Read();
            if (reader.TokenType != JsonTokenType.StartObject)
                throw new JsonException($"The calculation for \"{field}\" is not an object.");

            var braceEnd = bomLength + (int)reader.TokenStartIndex + 1;
            var whitespaceEnd = braceEnd;
            while (
                whitespaceEnd < json.Length
                && json[whitespaceEnd] is (byte)' ' or (byte)'\t' or (byte)'\r' or (byte)'\n'
            )
                whitespaceEnd++;
            var whitespace = json.AsSpan(braceEnd, whitespaceEnd - braceEnd);
            var isEmpty = whitespaceEnd < json.Length && json[whitespaceEnd] == (byte)'}';

            byte[] replacement =
            [
                (byte)'{',
                .. whitespace,
                .. "\"field\": "u8,
                .. name,
                .. (isEmpty ? whitespace : [(byte)',', .. whitespace]),
            ];
            edits.Add(new Edit(nameStart, whitespaceEnd - nameStart, replacement));
            reader.Skip();
        }

        edits.Add(new Edit(bomLength + (int)reader.TokenStartIndex, 1, "]"u8.ToArray()));
    }

    private sealed record Edit(int Start, int Length, byte[] Replacement);
}
