using System.Text.Json;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.PdfServiceTaskMigration;

/// <summary>
/// Reads applicationmetadata.json to determine which tasks need a PDF service task, and strips the
/// deprecated <c>enablePdfCreation</c> property from every dataType.
///
/// Legacy semantics (app-lib-dotnet v8): a PDF was generated at the end of a task only for dataTypes
/// that had <c>appLogic.classRef</c> set, <c>enablePdfCreation == true</c>, and were bound to that
/// task via <c>taskId</c>. Exactly one PDF was produced per task-end regardless of how many datamodels
/// qualified. The flag on attachment dataTypes (no classRef) or without a taskId (e.g. stateless) was
/// a no-op. We therefore group qualifying datamodels by taskId; each distinct task gets one pdf task.
/// </summary>
internal sealed class ApplicationMetadataPdfRewriter
{
    private readonly string _metadataFile;
    private readonly List<string> _warnings = new();

    public ApplicationMetadataPdfRewriter(string metadataFile)
    {
        _metadataFile = metadataFile;
    }

    public IReadOnlyList<string> GetWarnings() => _warnings;

    /// <summary>
    /// Returns the distinct taskIds that require a PDF service task, in document order, each paired
    /// with the id of the first qualifying dataType bound to that task. The dataType id is used to
    /// preserve gateway expression evaluation when a PDF task is inserted in front of a gateway
    /// (see PdfProcessRewriter): it is the task's form data model, which is what the gateway would
    /// previously have inferred from the data task's UI configuration.
    /// </summary>
    public IReadOnlyList<(string TaskId, string? DataTypeId)> GetTasksRequiringPdf()
    {
        using var doc = JsonDocument.Parse(Utf8TextFile.Decode(File.ReadAllBytes(_metadataFile)).Text);
        if (
            doc.RootElement.ValueKind != JsonValueKind.Object
            || !doc.RootElement.TryGetProperty("dataTypes", out var dataTypes)
            || dataTypes.ValueKind != JsonValueKind.Array
        )
        {
            return [];
        }

        var tasks = new List<(string TaskId, string? DataTypeId)>();
        foreach (var dataType in dataTypes.EnumerateArray())
        {
            if (dataType.ValueKind != JsonValueKind.Object)
                continue;

            if (!dataType.TryGetProperty("enablePdfCreation", out var flag) || flag.ValueKind != JsonValueKind.True)
                continue;

            var hasClassRef =
                dataType.TryGetProperty("appLogic", out var appLogic)
                && appLogic.ValueKind == JsonValueKind.Object
                && appLogic.TryGetProperty("classRef", out var classRef)
                && classRef.ValueKind == JsonValueKind.String
                && !string.IsNullOrWhiteSpace(classRef.GetString());

            var dataTypeId = dataType.TryGetProperty("id", out var id) ? id.GetString() : null;

            if (!hasClassRef)
            {
                // Legacy no-op: enablePdfCreation on an attachment/binary dataType never generated a PDF.
                continue;
            }

            if (
                !dataType.TryGetProperty("taskId", out var taskId)
                || taskId.ValueKind != JsonValueKind.String
                || taskId.GetString() is not { } task
                || string.IsNullOrWhiteSpace(task)
            )
            {
                // Legacy no-op: without a taskId (e.g. stateless data) there is no task-end to trigger on.
                _warnings.Add(
                    $"DataType '{dataTypeId ?? "<unknown>"}' has enablePdfCreation but no taskId; this was a no-op in "
                        + "the legacy backend, so no PDF service task was added."
                );
                continue;
            }

            if (!tasks.Exists(t => t.TaskId == task))
                tasks.Add((task, dataTypeId));
        }

        return tasks;
    }

    /// <summary>
    /// Removes every <c>enablePdfCreation</c> property (true and false) from the file, preserving the
    /// surrounding formatting. No-op if the property is absent. Verifies the result still parses.
    /// </summary>
    public async Task StripEnablePdfCreation()
    {
        var (original, hadBom) = Utf8TextFile.Decode(await File.ReadAllBytesAsync(_metadataFile));
        var lines = original.Split('\n');
        var kept = new List<string>(lines.Length);

        for (var i = 0; i < lines.Length; i++)
        {
            var line = lines[i];
            if (!IsEnablePdfCreationLine(line))
            {
                // Only remove lines holding the property and its literal value and nothing else. A line
                // that mentions the property but carries other content too (e.g. compact formatting with
                // several properties per line) would lose that content if removed wholesale - and the
                // result could still be valid JSON, defeating the parse check below.
                if (line.Contains("\"enablePdfCreation\"", StringComparison.Ordinal))
                {
                    _warnings.Add(
                        $"Found enablePdfCreation on a line with unexpected formatting in "
                            + $"{Path.GetFileName(_metadataFile)} (line {i + 1}); left it in place - please remove "
                            + "the property manually."
                    );
                }
                kept.Add(line);
                continue;
            }

            // If the removed property was the last one in its object, the previous kept line now has a
            // trailing comma before a closing brace - drop that comma (and only the comma, preserving
            // any trailing whitespace such as '\r' on CRLF files) to keep the JSON valid.
            var nextMeaningful = NextMeaningfulLine(lines, i);
            if (nextMeaningful.StartsWith('}') && kept.Count > 0)
            {
                var prev = kept[^1];
                var content = prev.TrimEnd();
                if (content.EndsWith(','))
                    kept[^1] = content[..^1] + prev[content.Length..];
            }
        }

        var result = string.Join('\n', kept);

        try
        {
            using var _ = JsonDocument.Parse(result);
        }
        catch (JsonException ex)
        {
            _warnings.Add(
                $"Removing enablePdfCreation from {Path.GetFileName(_metadataFile)} would produce invalid JSON "
                    + $"({ex.Message}). Left the file unchanged - please remove the property manually."
            );
            return;
        }

        if (!string.Equals(result, original, StringComparison.Ordinal))
            await Utf8TextFile.Write(_metadataFile, result, withBom: hadBom);
    }

    private static bool IsEnablePdfCreationLine(string line)
    {
        // Match a whole line of the form `"enablePdfCreation": true,` (value true/false, comma optional)
        // and nothing else, so removing the line cannot take any other content with it.
        var trimmed = line.Trim();
        if (!trimmed.StartsWith("\"enablePdfCreation\"", StringComparison.Ordinal))
            return false;

        var rest = trimmed["\"enablePdfCreation\"".Length..].TrimStart();
        if (!rest.StartsWith(':'))
            return false;

        rest = rest[1..].TrimStart().TrimEnd(',').TrimEnd();
        return rest is "true" or "false";
    }

    private static string NextMeaningfulLine(string[] lines, int from)
    {
        for (var i = from + 1; i < lines.Length; i++)
        {
            var trimmed = lines[i].TrimStart();
            if (trimmed.Length > 0)
                return trimmed;
        }

        return string.Empty;
    }
}
