using System.Text;
using System.Text.Json;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

internal static class Summary2PageBreakMigration
{
    private const string ComponentType = "Summary2";

    public static async Task<int> Migrate(string projectFolder)
    {
        var uiDirectory = ResolveUiDirectory(projectFolder);
        if (uiDirectory is null)
        {
            await UpgradeConsole.Out.WriteLineAsync("No UI directory found, skipping Summary2 pageBreak migration");
            return 0;
        }

        var changedFiles = 0;
        var removedProperties = 0;
        foreach (var layoutFile in FindLayoutFiles(uiDirectory))
        {
            var decoded = Utf8TextFile.Decode(await File.ReadAllBytesAsync(layoutFile));
            var (migrated, removedInFile) = RemovePageBreakFromSummary2(decoded.Text);
            if (removedInFile == 0)
                continue;

            await Utf8TextFile.Write(layoutFile, migrated, decoded.HadBom);
            changedFiles++;
            removedProperties += removedInFile;
            await UpgradeConsole.Out.WriteLineAsync(
                $"Removed pageBreak from {removedInFile} Summary2 component(s) in {layoutFile}"
            );
        }

        await UpgradeConsole.Out.WriteLineAsync(
            changedFiles == 0
                ? "No Summary2 pageBreak properties found to remove"
                : $"Removed pageBreak from {removedProperties} Summary2 component(s) across {changedFiles} layout file(s)"
        );
        return 0;
    }

    private static string? ResolveUiDirectory(string projectFolder)
    {
        var appUiDirectory = Path.Combine(projectFolder, "App", "ui");
        if (Directory.Exists(appUiDirectory))
            return appUiDirectory;

        var uiDirectory = Path.Combine(projectFolder, "ui");
        return Directory.Exists(uiDirectory) ? uiDirectory : null;
    }

    private static IEnumerable<string> FindLayoutFiles(string uiDirectory) =>
        Directory
            .EnumerateFiles(uiDirectory, "*.json", SearchOption.AllDirectories)
            .Where(path =>
                string.Equals(Path.GetFileName(Path.GetDirectoryName(path)), "layouts", StringComparison.Ordinal)
            );

    private static (string Migrated, int Removed) RemovePageBreakFromSummary2(string content)
    {
        var bytes = Encoding.UTF8.GetBytes(content);
        var reader = new Utf8JsonReader(
            bytes,
            new JsonReaderOptions { CommentHandling = JsonCommentHandling.Skip, AllowTrailingCommas = true }
        );
        var edits = new List<TextEdit>();

        if (!reader.Read())
            throw new JsonException("Layout file does not contain JSON");

        ProcessValue(ref reader, bytes, edits);
        if (reader.Read())
            throw new JsonException("Layout file contains data after the root JSON value");

        if (edits.Count == 0)
            return (content, 0);

        return (ApplyEdits(bytes, edits), edits.Count / 2);
    }

    private static void ProcessValue(ref Utf8JsonReader reader, byte[] source, List<TextEdit> edits)
    {
        if (reader.TokenType == JsonTokenType.StartObject)
        {
            ProcessObject(ref reader, source, edits);
        }
        else if (reader.TokenType == JsonTokenType.StartArray)
        {
            while (reader.Read() && reader.TokenType != JsonTokenType.EndArray)
                ProcessValue(ref reader, source, edits);

            if (reader.TokenType != JsonTokenType.EndArray)
                throw new JsonException("Unterminated JSON array");
        }
    }

    private static void ProcessObject(ref Utf8JsonReader reader, byte[] source, List<TextEdit> edits)
    {
        var properties = new List<JsonProperty>();
        string? componentType = null;
        var objectEnd = -1;

        while (reader.Read())
        {
            if (reader.TokenType == JsonTokenType.EndObject)
            {
                objectEnd = checked((int)reader.TokenStartIndex);
                break;
            }

            if (reader.TokenType != JsonTokenType.PropertyName)
                throw new JsonException("Expected a JSON property name");

            var name = reader.GetString() ?? throw new JsonException("JSON property name is null");
            var start = checked((int)reader.TokenStartIndex);
            if (!reader.Read())
                throw new JsonException($"Missing value for JSON property {name}");

            if (name == "type" && reader.TokenType == JsonTokenType.String)
                componentType = reader.GetString();

            ProcessValue(ref reader, source, edits);
            properties.Add(new JsonProperty(name, start, checked((int)reader.BytesConsumed)));
        }

        if (objectEnd < 0)
            throw new JsonException("Unterminated JSON object");

        if (componentType != ComponentType)
            return;

        for (var index = 0; index < properties.Count; index++)
        {
            var property = properties[index];
            if (property.Name != "pageBreak")
                continue;

            var nextBoundary = index + 1 < properties.Count ? properties[index + 1].Start : objectEnd;
            var comma = FindComma(source, property.End, nextBoundary);
            if (comma < 0 && index > 0)
                comma = FindComma(source, properties[index - 1].End, property.Start);
            if (comma < 0)
                throw new JsonException("Could not find a delimiter for Summary2 pageBreak property");

            edits.Add(new TextEdit(property.Start, property.End));
            edits.Add(new TextEdit(comma, comma + 1));
        }
    }

    private static int FindComma(byte[] source, int start, int end)
    {
        for (var index = start; index < end; index++)
        {
            if (source[index] == (byte)',')
                return index;
        }

        return -1;
    }

    private static string ApplyEdits(byte[] source, List<TextEdit> edits)
    {
        edits.Sort((left, right) => left.Start.CompareTo(right.Start));
        using var output = new MemoryStream(source.Length);
        var position = 0;
        foreach (var edit in edits)
        {
            if (edit.Start < position)
                throw new InvalidOperationException("Overlapping JSON text edits");

            output.Write(source, position, edit.Start - position);
            position = edit.End;
        }

        output.Write(source, position, source.Length - position);
        return Encoding.UTF8.GetString(output.ToArray());
    }

    private sealed record JsonProperty(string Name, int Start, int End);

    private sealed record TextEdit(int Start, int End);
}
