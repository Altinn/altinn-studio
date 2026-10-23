using System.Text.Json;
using System.Text.RegularExpressions;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.PdfServiceTaskMigration;

/// <summary>
/// Reads applicationmetadata.json to determine which tasks need a PDF service task, and removes the
/// deprecated <c>enablePdfCreation</c> property where it is <c>true</c>.
///
/// A <c>false</c> stays: v9 ignores it, and it is the only record that the dataType generated no PDF in
/// v8, so without it a re-run of the upgrade would add a PDF service task the app never had.
///
/// Legacy semantics (app-lib-dotnet v8): a PDF was generated at the end of a task only for dataTypes
/// that had <c>appLogic.classRef</c> set, <c>enablePdfCreation == true</c>, and were bound to that
/// task via <c>taskId</c>. The flag defaults to true in v8, so a dataType without it counts as enabled.
/// Exactly one PDF was produced per task-end regardless of how many datamodels qualified. The flag on
/// attachment dataTypes (no classRef) or without a taskId (e.g. stateless) was a no-op. We therefore
/// group qualifying datamodels by taskId; each distinct task gets one pdf task.
/// </summary>
internal sealed partial class ApplicationMetadataPdfRewriter
{
    private const string PropertyName = "enablePdfCreation";

    private readonly string _metadataFile;
    private readonly List<string> _warnings = new();
    private IReadOnlyList<string> _pdfDisabledDataTypes = [];

    public ApplicationMetadataPdfRewriter(string metadataFile)
    {
        _metadataFile = metadataFile;
    }

    public IReadOnlyList<string> GetWarnings() => _warnings;

    /// <summary>
    /// The ids of the form dataTypes whose <c>enablePdfCreation</c> is <c>false</c> and whose task has no
    /// other dataType that needs a PDF, in document order. Filled by <see cref="GetTasksRequiringPdf"/>.
    /// </summary>
    public IReadOnlyList<string> GetPdfDisabledDataTypes() => _pdfDisabledDataTypes;

    /// <summary>
    /// True when <see cref="StripEnablePdfCreation"/> could not remove a <c>true</c> flag safely and left
    /// it in the file, so a human must remove it manually.
    /// </summary>
    public bool ManualActionRequired { get; private set; }

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
        var pdfDisabled = new List<(string DataTypeId, string TaskId)>();
        foreach (var dataType in dataTypes.EnumerateArray())
        {
            if (dataType.ValueKind != JsonValueKind.Object)
                continue;

            // Case-insensitive: v8 deserializes applicationmetadata.json with Newtonsoft, which matches
            // property names case-insensitively, so a hand-edited e.g. "EnablePdfCreation" generated PDFs
            // under v8 and must not be missed here. A missing flag is v8's default, true.
            var hasFlag = TryGetPropertyIgnoreCase(dataType, PropertyName, out var flag);
            var pdfEnabled = !hasFlag || flag.ValueKind == JsonValueKind.True;

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
                // Only an explicit flag is worth a warning; the implicit default is on every such dataType.
                if (hasFlag && pdfEnabled)
                    _warnings.Add(
                        $"DataType '{dataTypeId ?? "<unknown>"}' has enablePdfCreation but no taskId; this was a no-op in "
                            + "the legacy backend, so no PDF service task was added."
                    );
                continue;
            }

            if (!pdfEnabled)
            {
                // StripEnablePdfCreation keeps only a false; any other value becomes a to-do there.
                if (flag.ValueKind == JsonValueKind.False)
                    pdfDisabled.Add((dataTypeId ?? "<unknown>", task));
                continue;
            }

            if (!tasks.Exists(t => t.TaskId == task))
                tasks.Add((task, dataTypeId));
        }

        _pdfDisabledDataTypes =
        [
            .. pdfDisabled.Where(d => !tasks.Exists(t => t.TaskId == d.TaskId)).Select(d => d.DataTypeId),
        ];
        return tasks;
    }

    /// <summary>
    /// Removes every <c>enablePdfCreation</c> property whose value is <c>true</c> from the file, preserving
    /// the surrounding formatting. Verifies the result still parses.
    /// </summary>
    public async Task StripEnablePdfCreation()
    {
        var (original, hadBom) = Utf8TextFile.Decode(await File.ReadAllBytesAsync(_metadataFile));
        var lines = original.Split('\n');
        var kept = new List<string>(lines.Length);

        for (var i = 0; i < lines.Length; i++)
        {
            var line = lines[i];
            if (!IsEnablePdfCreationTrueLine(line))
            {
                // Only remove lines holding the property and the literal value true and nothing else. A
                // line that mentions the property but carries other content too (e.g. compact formatting
                // with several properties per line) would lose that content if removed wholesale - and the
                // result could still be valid JSON, defeating the parse check below.
                if (MentionsFlagOtherThanFalse(line))
                {
                    ManualActionRequired = true;
                    _warnings.Add(
                        $"Found enablePdfCreation on a line with unexpected formatting in "
                            + $"{Path.GetFileName(_metadataFile)} (line {i + 1}); left it in place - please remove "
                            + "the property manually unless it is false."
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
            ManualActionRequired = true;
            _warnings.Add(
                $"Removing enablePdfCreation: true from {Path.GetFileName(_metadataFile)} would produce invalid "
                    + $"JSON ({ex.Message}). Left the file unchanged - please remove it manually."
            );
            return;
        }

        if (!string.Equals(result, original, StringComparison.Ordinal))
            await Utf8TextFile.Write(_metadataFile, result, withBom: hadBom);
    }

    private static bool IsEnablePdfCreationTrueLine(string line)
    {
        // Match a whole line of the form `"enablePdfCreation": true,` (comma optional) and nothing else,
        // so removing the line cannot take any other content with it.
        var trimmed = line.Trim();
        var quotedName = $"\"{PropertyName}\"";
        if (!trimmed.StartsWith(quotedName, StringComparison.OrdinalIgnoreCase))
            return false;

        var rest = trimmed[quotedName.Length..].TrimStart();
        if (!rest.StartsWith(':'))
            return false;

        rest = rest[1..].TrimStart().TrimEnd(',').TrimEnd();
        return rest is "true";
    }

    private static bool MentionsFlagOtherThanFalse(string line) =>
        FalseFlag().Replace(line, string.Empty).Contains($"\"{PropertyName}\"", StringComparison.OrdinalIgnoreCase);

    [GeneratedRegex(@"""(?i:enablePdfCreation)""\s*:\s*false\b")]
    private static partial Regex FalseFlag();

    private static bool TryGetPropertyIgnoreCase(JsonElement element, string name, out JsonElement value)
    {
        // System.Text.Json's TryGetProperty is always ordinal; enumerate to match Newtonsoft's
        // case-insensitive property binding. Prefer an exact match, then fall back to a case-insensitive
        // one, mirroring Newtonsoft (exact first, case-insensitive second).
        if (element.TryGetProperty(name, out value))
            return true;

        foreach (var property in element.EnumerateObject())
        {
            if (string.Equals(property.Name, name, StringComparison.OrdinalIgnoreCase))
            {
                value = property.Value;
                return true;
            }
        }

        value = default;
        return false;
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
