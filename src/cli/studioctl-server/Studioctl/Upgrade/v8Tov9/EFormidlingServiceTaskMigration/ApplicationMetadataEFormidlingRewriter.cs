using System.Text.Json;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.EFormidlingServiceTaskMigration;

/// <summary>
/// Reads the deprecated top-level <c>eFormidling</c> block from applicationmetadata.json and removes
/// it once the configuration has been migrated to a BPMN eFormidling service task.
///
/// Legacy semantics (app-lib-dotnet v8): at the end of the task matching <c>sendAfterTaskId</c>, an
/// eFormidling shipment was sent - if <c>AppSettings:EnableEFormidling</c> was true in appsettings
/// (see <see cref="AppSettingsEFormidlingRewriter"/>) and the app had registered the eFormidling
/// services. All other properties described the shipment itself and map 1:1 to the v9
/// <c>&lt;altinn:eFormidlingConfig&gt;</c> elements, except <c>serviceId</c> which has no v9
/// counterpart.
/// </summary>
internal sealed class ApplicationMetadataEFormidlingRewriter
{
    private readonly string _metadataFile;
    private readonly List<string> _warnings = new();

    private static readonly string[] _knownProperties =
    [
        "serviceId",
        "dpfShipmentType",
        "receiver",
        "sendAfterTaskId",
        "process",
        "standard",
        "typeVersion",
        "type",
        "securityLevel",
        "dataTypes",
    ];

    public ApplicationMetadataEFormidlingRewriter(string metadataFile)
    {
        _metadataFile = metadataFile;
    }

    public IReadOnlyList<string> GetWarnings() => _warnings;

    /// <summary>
    /// Returns the legacy eFormidling configuration, or null when applicationmetadata.json has no
    /// <c>eFormidling</c> property at all (nothing to migrate).
    /// </summary>
    public LegacyEFormidlingConfiguration? ReadLegacyConfiguration()
    {
        using var doc = JsonDocument.Parse(File.ReadAllText(_metadataFile));
        if (
            doc.RootElement.ValueKind != JsonValueKind.Object
            || !doc.RootElement.TryGetProperty("eFormidling", out var block)
        )
        {
            return null;
        }

        if (block.ValueKind != JsonValueKind.Object)
        {
            // A null (or otherwise non-object) block was ignored by the legacy backend.
            return new LegacyEFormidlingConfiguration(null, null, null, null, null, null, null, null, null, []);
        }

        var unknownProperties = new List<string>();
        foreach (var property in block.EnumerateObject())
        {
            if (Array.IndexOf(_knownProperties, property.Name) < 0)
                unknownProperties.Add(property.Name);
        }

        if (unknownProperties.Count > 0)
        {
            _warnings.Add(
                $"The eFormidling block contains unrecognized propert{(unknownProperties.Count == 1 ? "y" : "ies")} "
                    + $"[{string.Join(", ", unknownProperties)}] that will not be migrated."
            );
        }

        return new LegacyEFormidlingConfiguration(
            GetString(block, "serviceId"),
            GetString(block, "dpfShipmentType"),
            GetString(block, "receiver"),
            GetString(block, "sendAfterTaskId"),
            GetString(block, "process"),
            GetString(block, "standard"),
            GetString(block, "typeVersion"),
            GetString(block, "type"),
            GetSecurityLevel(block),
            GetDataTypes(block)
        );
    }

    /// <summary>
    /// Returns the id of the first dataType with <c>appLogic.classRef</c> bound to the given task -
    /// the task's form data model. Used to pin <c>connectedDataTypeId</c> on downstream gateways
    /// whose expressions previously inferred their data model from that task (see
    /// <see cref="EFormidlingProcessRewriter"/>).
    /// </summary>
    public string? GetFormDataTypeForTask(string taskId)
    {
        using var doc = JsonDocument.Parse(File.ReadAllText(_metadataFile));
        if (
            doc.RootElement.ValueKind != JsonValueKind.Object
            || !doc.RootElement.TryGetProperty("dataTypes", out var dataTypes)
            || dataTypes.ValueKind != JsonValueKind.Array
        )
        {
            return null;
        }

        foreach (var dataType in dataTypes.EnumerateArray())
        {
            if (dataType.ValueKind != JsonValueKind.Object)
                continue;

            var hasClassRef =
                dataType.TryGetProperty("appLogic", out var appLogic)
                && appLogic.ValueKind == JsonValueKind.Object
                && appLogic.TryGetProperty("classRef", out var classRef)
                && classRef.ValueKind == JsonValueKind.String
                && !string.IsNullOrWhiteSpace(classRef.GetString());

            if (
                hasClassRef
                && dataType.TryGetProperty("taskId", out var boundTask)
                && boundTask.ValueKind == JsonValueKind.String
                && boundTask.GetString() == taskId
                && dataType.TryGetProperty("id", out var id)
                && id.ValueKind == JsonValueKind.String
            )
            {
                return id.GetString();
            }
        }

        return null;
    }

    /// <summary>
    /// Removes the whole <c>eFormidling</c> property (including a multi-line object value) from the
    /// file, preserving the surrounding formatting byte-for-byte. The property's exact span is
    /// located with <see cref="Utf8JsonReader"/> (so string content elsewhere can never be
    /// mis-matched), and is only removed when it occupies whole lines by itself; otherwise the file
    /// is left unchanged with a warning. Verifies the result still parses.
    /// </summary>
    public async Task StripEFormidlingBlock()
    {
        var bytes = await File.ReadAllBytesAsync(_metadataFile);

        if (!TryLocateBlock(bytes, out var propertyStart, out var valueEnd))
            return;

        // The property must start its own line (only whitespace before it).
        int lineStart = propertyStart;
        while (lineStart > 0 && bytes[lineStart - 1] != (byte)'\n')
            lineStart--;
        for (int i = lineStart; i < propertyStart; i++)
        {
            if (bytes[i] != (byte)' ' && bytes[i] != (byte)'\t')
            {
                WarnUnexpectedFormatting();
                return;
            }
        }

        // After the value: optional whitespace, optional trailing comma, then end of line/file.
        int cursor = valueEnd;
        while (cursor < bytes.Length && (bytes[cursor] == (byte)' ' || bytes[cursor] == (byte)'\t'))
            cursor++;
        var hadTrailingComma = cursor < bytes.Length && bytes[cursor] == (byte)',';
        if (hadTrailingComma)
            cursor++;
        while (
            cursor < bytes.Length
            && (bytes[cursor] == (byte)' ' || bytes[cursor] == (byte)'\t' || bytes[cursor] == (byte)'\r')
        )
        {
            cursor++;
        }

        int removeEnd;
        if (cursor >= bytes.Length)
        {
            removeEnd = bytes.Length;
        }
        else if (bytes[cursor] == (byte)'\n')
        {
            removeEnd = cursor + 1;
        }
        else
        {
            WarnUnexpectedFormatting();
            return;
        }

        // If the removed property was the last one in the root object, the previous content now ends
        // with a trailing comma before the closing brace - drop that single comma byte.
        int removeStart = lineStart;
        int danglingCommaIndex = -1;
        if (!hadTrailingComma)
        {
            for (int i = removeStart - 1; i >= 0; i--)
            {
                var b = bytes[i];
                if (b == (byte)' ' || b == (byte)'\t' || b == (byte)'\r' || b == (byte)'\n')
                    continue;
                if (b == (byte)',')
                    danglingCommaIndex = i;
                break;
            }
        }

        var resultBytes = RemoveSpan(bytes, removeStart, removeEnd, danglingCommaIndex);
        try
        {
            using var _ = JsonDocument.Parse(StripUtf8Bom(resultBytes));
        }
        catch (JsonException ex)
        {
            _warnings.Add(
                $"Removing the eFormidling block from {Path.GetFileName(_metadataFile)} would produce invalid "
                    + $"JSON ({ex.Message}). Left the file unchanged - please remove the block manually."
            );
            return;
        }

        await File.WriteAllBytesAsync(_metadataFile, resultBytes);
    }

    /// <summary>
    /// Locates the exact byte span of the top-level <c>eFormidling</c> property: from the opening
    /// quote of the property name through the end of its value.
    /// </summary>
    private static bool TryLocateBlock(byte[] bytes, out int propertyStart, out int valueEnd)
    {
        propertyStart = 0;
        valueEnd = 0;

        var memory = StripUtf8Bom(bytes);
        var bomLength = bytes.Length - memory.Length;
        var reader = new Utf8JsonReader(memory.Span);
        while (reader.Read())
        {
            if (
                reader.CurrentDepth == 1
                && reader.TokenType == JsonTokenType.PropertyName
                && reader.ValueTextEquals("eFormidling")
            )
            {
                propertyStart = bomLength + (int)reader.TokenStartIndex;
                reader.Read();
                reader.Skip();
                valueEnd = bomLength + (int)reader.BytesConsumed;
                return true;
            }
        }

        return false;
    }

    /// <summary>Removes [removeStart, removeEnd) and, when given, the single dangling comma byte before it.</summary>
    private static byte[] RemoveSpan(byte[] bytes, int removeStart, int removeEnd, int danglingCommaIndex)
    {
        var commaBytes = danglingCommaIndex >= 0 ? 1 : 0;
        var result = new byte[bytes.Length - (removeEnd - removeStart) - commaBytes];
        var position = 0;

        if (danglingCommaIndex >= 0)
        {
            Array.Copy(bytes, 0, result, 0, danglingCommaIndex);
            position = danglingCommaIndex;
            Array.Copy(bytes, danglingCommaIndex + 1, result, position, removeStart - danglingCommaIndex - 1);
            position += removeStart - danglingCommaIndex - 1;
        }
        else
        {
            Array.Copy(bytes, 0, result, 0, removeStart);
            position = removeStart;
        }

        Array.Copy(bytes, removeEnd, result, position, bytes.Length - removeEnd);
        return result;
    }

    private static ReadOnlyMemory<byte> StripUtf8Bom(byte[] bytes) =>
        bytes.Length >= 3 && bytes[0] == 0xEF && bytes[1] == 0xBB && bytes[2] == 0xBF
            ? bytes.AsMemory(3)
            : bytes.AsMemory();

    private void WarnUnexpectedFormatting()
    {
        _warnings.Add(
            $"Found the eFormidling block on a line with unexpected formatting in "
                + $"{Path.GetFileName(_metadataFile)}; left it in place - please remove the block manually."
        );
    }

    private static string? GetString(JsonElement block, string propertyName)
    {
        if (
            !block.TryGetProperty(propertyName, out var value)
            || value.ValueKind != JsonValueKind.String
            || value.GetString() is not { } text
            || string.IsNullOrWhiteSpace(text)
        )
        {
            return null;
        }

        return text;
    }

    private string? GetSecurityLevel(JsonElement block)
    {
        if (!block.TryGetProperty("securityLevel", out var value))
            return null;

        switch (value.ValueKind)
        {
            case JsonValueKind.Number:
                return value.GetRawText();
            case JsonValueKind.String when !string.IsNullOrWhiteSpace(value.GetString()):
                return value.GetString();
            case JsonValueKind.Null:
                return null;
            default:
                _warnings.Add(
                    $"The eFormidling securityLevel value ({value.GetRawText()}) is not a number and was not migrated."
                );
                return null;
        }
    }

    private IReadOnlyList<string> GetDataTypes(JsonElement block)
    {
        if (!block.TryGetProperty("dataTypes", out var dataTypes))
            return [];

        if (dataTypes.ValueKind != JsonValueKind.Array)
        {
            if (dataTypes.ValueKind != JsonValueKind.Null)
                _warnings.Add("The eFormidling dataTypes value is not an array and was not migrated.");
            return [];
        }

        var result = new List<string>();
        foreach (var dataType in dataTypes.EnumerateArray())
        {
            if (
                dataType.ValueKind == JsonValueKind.String
                && dataType.GetString() is { } id
                && !string.IsNullOrWhiteSpace(id)
            )
                result.Add(id);
            else
                _warnings.Add($"An eFormidling dataTypes entry ({dataType.GetRawText()}) is not a string; skipped.");
        }

        return result;
    }
}
