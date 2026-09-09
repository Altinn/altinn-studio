using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

internal sealed record ComponentRequiredMigrationResult(
    int FilesChanged,
    int PropertiesRemoved,
    MigrationResult Messages
);

/// <summary>
/// Migrates <c>required</c> properties that v9 no longer reads because requiredness is owned by
/// each component. Properties on components that still support <c>required</c> are left alone.
/// </summary>
internal sealed class ComponentRequiredMigration(string projectFolder)
{
    private static readonly IReadOnlyDictionary<string, string> _minimumProperties = new Dictionary<string, string>(
        StringComparer.Ordinal
    )
    {
        ["FileUpload"] = "minNumberOfAttachments",
        ["FileUploadWithTag"] = "minNumberOfAttachments",
        ["RepeatingGroup"] = "minCount",
    };

    private static readonly HashSet<string> _knownUnsupportedComponentTypes = new(StringComparer.Ordinal)
    {
        "Accordion",
        "AccordionGroup",
        "ActionButton",
        "Alert",
        "AttachmentList",
        "Audio",
        "Button",
        "ButtonGroup",
        "Cards",
        "CustomButton",
        "Date",
        "Divider",
        "FileUpload",
        "FileUploadWithTag",
        "Grid",
        "Group",
        "Heading",
        "IFrame",
        "Image",
        "InstanceInformation",
        "InstantiationButton",
        "Link",
        "NavigationBar",
        "NavigationButtons",
        "Number",
        "Option",
        "Panel",
        "Paragraph",
        "Payment",
        "PaymentDetails",
        "PDFPreviewButton",
        "PrintButton",
        "RepeatingGroup",
        "SigneeList",
        "SigningActions",
        "SigningDocumentList",
        "Summary",
        "Summary2",
        "Tabs",
        "Text",
        "Video",
    };

    public async Task<ComponentRequiredMigrationResult> Migrate()
    {
        var uiDirectory = ResolveUiDirectory(projectFolder);
        if (uiDirectory is null)
            return new ComponentRequiredMigrationResult(0, 0, new MigrationResult());

        var messages = new List<UpgradeMessage>();
        var filesChanged = 0;
        var propertiesRemoved = 0;

        foreach (var layoutFile in FindLayoutFiles(uiDirectory))
        {
            var decoded = Utf8TextFile.Decode(await File.ReadAllBytesAsync(layoutFile));
            var root = JsonNode.Parse(
                decoded.Text,
                new JsonNodeOptions { PropertyNameCaseInsensitive = false },
                new JsonDocumentOptions { CommentHandling = JsonCommentHandling.Skip, AllowTrailingCommas = true }
            );
            if (root is null)
                throw new JsonException($"Layout file does not contain JSON: {layoutFile}");

            var relativePath = Path.GetRelativePath(uiDirectory, layoutFile).Replace('\\', '/');
            var removals = new HashSet<string>(StringComparer.Ordinal);
            var changes = MigrateComponents(root, [], relativePath, messages, removals);
            if (!changes.Changed)
                continue;

            var updated = ApplyRemovals(decoded.Text, removals);
            await Utf8TextFile.Write(layoutFile, updated, decoded.HadBom);
            filesChanged++;
            propertiesRemoved += changes.PropertiesRemoved;
        }

        return new ComponentRequiredMigrationResult(filesChanged, propertiesRemoved, new MigrationResult(messages));
    }

    private static ComponentChanges MigrateComponents(
        JsonNode node,
        List<string> path,
        string fileName,
        List<UpgradeMessage> messages,
        ISet<string> removals
    )
    {
        var changes = new ComponentChanges();
        if (node is JsonObject component)
        {
            if (
                component["type"] is JsonValue typeValue
                && typeValue.TryGetValue<string>(out var type)
                && component.TryGetPropertyValue("required", out var requiredNode)
                && _knownUnsupportedComponentTypes.Contains(type)
            )
            {
                var componentChanges = MigrateComponent(component, type, requiredNode, fileName, messages);
                changes.Add(componentChanges);
                if (componentChanges.Changed)
                    removals.Add(ToJsonPointer([.. path, "required"]));
            }

            foreach (var (name, child) in component)
                if (child is not null)
                    changes.Add(MigrateComponents(child, [.. path, name], fileName, messages, removals));
        }
        else if (node is JsonArray array)
        {
            for (var index = 0; index < array.Count; index++)
                if (array[index] is { } child)
                    changes.Add(
                        MigrateComponents(
                            child,
                            [.. path, index.ToString(CultureInfo.InvariantCulture)],
                            fileName,
                            messages,
                            removals
                        )
                    );
        }

        return changes;
    }

    private static ComponentChanges MigrateComponent(
        JsonObject component,
        string type,
        JsonNode? requiredNode,
        string fileName,
        List<UpgradeMessage> messages
    )
    {
        if (
            _minimumProperties.TryGetValue(type, out var minimumProperty)
            && requiredNode is JsonValue requiredValue
            && requiredValue.TryGetValue<bool>(out var required)
            && component.TryGetPropertyValue(minimumProperty, out var minimumNode)
            && minimumNode is JsonValue minimumValue
            && minimumValue.TryGetValue<int>(out var minimum)
            && (minimum > 0) != required
        )
        {
            var componentId = component["id"]?.GetValue<string>() ?? "<missing id>";
            AddConflict(
                messages,
                fileName,
                type,
                componentId,
                $"`required` is {required.ToString().ToLowerInvariant()} but `{minimumProperty}` is {minimum}"
            );
        }

        component.Remove("required");
        return new ComponentChanges { PropertiesRemoved = 1 };
    }

    private static void AddConflict(
        List<UpgradeMessage> messages,
        string fileName,
        string type,
        string componentId,
        string reason
    )
    {
        messages.Todo(
            $"{fileName}: {type} '{componentId}' had conflicting requiredness: {reason}. The upgrade removed `required` and kept the minimum-count setting unchanged. Check that the remaining minimum expresses what the app should require."
        );
    }

    private static string? ResolveUiDirectory(string root)
    {
        var appUiDirectory = Path.Combine(root, "App", "ui");
        if (Directory.Exists(appUiDirectory))
            return appUiDirectory;

        var uiDirectory = Path.Combine(root, "ui");
        return Directory.Exists(uiDirectory) ? uiDirectory : null;
    }

    private static IEnumerable<string> FindLayoutFiles(string uiDirectory) =>
        Directory
            .EnumerateFiles(uiDirectory, "*.json", SearchOption.AllDirectories)
            .Where(path =>
                string.Equals(Path.GetFileName(Path.GetDirectoryName(path)), "layouts", StringComparison.Ordinal)
            );

    private static string ApplyRemovals(string content, IReadOnlySet<string> removals)
    {
        var bytes = Encoding.UTF8.GetBytes(content);
        var reader = new Utf8JsonReader(
            bytes,
            new JsonReaderOptions { CommentHandling = JsonCommentHandling.Skip, AllowTrailingCommas = true }
        );
        if (!reader.Read())
            throw new JsonException("Layout file does not contain JSON");

        var spans = new List<PropertySpan>();
        FindPropertySpans(ref reader, [], removals, spans);
        if (spans.Count != removals.Count)
            throw new InvalidOperationException(
                $"Could not locate all required properties in the source JSON ({spans.Count} of {removals.Count})"
            );

        foreach (var span in spans.OrderByDescending(item => item.Start))
            bytes = RemoveProperty(bytes, span);

        return Encoding.UTF8.GetString(bytes);
    }

    private static void FindPropertySpans(
        ref Utf8JsonReader reader,
        List<string> path,
        IReadOnlySet<string> removals,
        ICollection<PropertySpan> spans
    )
    {
        if (reader.TokenType == JsonTokenType.StartObject)
        {
            while (reader.Read() && reader.TokenType != JsonTokenType.EndObject)
            {
                if (reader.TokenType != JsonTokenType.PropertyName)
                    throw new JsonException("Expected a property name");

                var propertyName = reader.GetString() ?? throw new JsonException("Property name is null");
                var propertyPath = new List<string>(path) { propertyName };
                var propertyStart = checked((int)reader.TokenStartIndex);
                if (!reader.Read())
                    throw new JsonException("Expected a property value");

                if (removals.Contains(ToJsonPointer(propertyPath)))
                {
                    reader.Skip();
                    spans.Add(new PropertySpan(propertyStart, checked((int)reader.BytesConsumed)));
                }
                else
                {
                    FindPropertySpans(ref reader, propertyPath, removals, spans);
                }
            }
        }
        else if (reader.TokenType == JsonTokenType.StartArray)
        {
            var index = 0;
            while (reader.Read() && reader.TokenType != JsonTokenType.EndArray)
            {
                FindPropertySpans(ref reader, [.. path, index.ToString(CultureInfo.InvariantCulture)], removals, spans);
                index++;
            }
        }
    }

    private static byte[] RemoveProperty(byte[] bytes, PropertySpan span)
    {
        var start = span.Start;
        var end = span.End;
        var cursor = end;
        while (cursor < bytes.Length && IsJsonWhitespace(bytes[cursor]))
            cursor++;

        if (cursor < bytes.Length && bytes[cursor] == (byte)',')
        {
            end = cursor + 1;
            var lineStart = start;
            while (lineStart > 0 && bytes[lineStart - 1] != (byte)'\n')
                lineStart--;

            var propertyStartsLine = true;
            for (var index = lineStart; index < start; index++)
                propertyStartsLine &= bytes[index] is (byte)' ' or (byte)'\t';

            cursor = end;
            while (cursor < bytes.Length && bytes[cursor] is (byte)' ' or (byte)'\t' or (byte)'\r')
                cursor++;
            if (propertyStartsLine && cursor < bytes.Length && bytes[cursor] == (byte)'\n')
            {
                start = lineStart;
                end = cursor + 1;
            }
        }
        else
        {
            cursor = start - 1;
            while (cursor >= 0 && IsJsonWhitespace(bytes[cursor]))
                cursor--;
            if (cursor >= 0 && bytes[cursor] == (byte)',')
                start = cursor;
        }

        var result = new byte[bytes.Length - (end - start)];
        Array.Copy(bytes, 0, result, 0, start);
        Array.Copy(bytes, end, result, start, bytes.Length - end);
        return result;
    }

    private static bool IsJsonWhitespace(byte value) => value is (byte)' ' or (byte)'\t' or (byte)'\r' or (byte)'\n';

    private static string ToJsonPointer(IEnumerable<string> path) =>
        "/" + string.Join("/", path.Select(segment => segment.Replace("~", "~0").Replace("/", "~1")));

    private sealed record PropertySpan(int Start, int End);

    private sealed class ComponentChanges
    {
        public int PropertiesRemoved { get; set; }
        public bool Changed => PropertiesRemoved > 0;

        public void Add(ComponentChanges other)
        {
            PropertiesRemoved += other.PropertiesRemoved;
        }
    }
}
