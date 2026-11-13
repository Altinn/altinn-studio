using System.Text;
using System.Text.Json;
using System.Xml;
using System.Xml.Linq;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>
/// Sets <c>"onProcessEnd": { "confirm": true }</c> in applicationmetadata.json for an app that confirmed its instances
/// as complete in v8, where the eFormidling task confirmed once the shipment was delivered and the Fiks Arkiv task
/// confirmed after the archive's receipt when <c>SuccessHandling:MarkInstanceComplete</c> was on (off by default). The
/// v9 tasks never confirm; only this setting does, once the process has ended. The file is edited in place, keeping its
/// encoding, line endings and indentation.
/// </summary>
internal static class OnProcessEndConfirmMigration
{
    private const string MetadataPath = "config/applicationmetadata.json";
    private const string PropertyName = "onProcessEnd";
    private const string ConfirmName = "confirm";
    private static readonly XNamespace _altinnNs = "http://altinn.no/process";

    private static readonly JsonDocumentOptions _settingsOptions = new()
    {
        AllowTrailingCommas = true,
        CommentHandling = JsonCommentHandling.Skip,
    };

    private static readonly JsonReaderOptions _metadataOptions = new()
    {
        AllowTrailingCommas = true,
        CommentHandling = JsonCommentHandling.Skip,
    };

    public static async Task<MigrationResult> Migrate(string projectFolder)
    {
        var messages = new List<UpgradeMessage>();
        var reasons = ReasonsToConfirm(projectFolder, messages);
        if (reasons.Count == 0)
            return new MigrationResult(messages);

        var inV8 = $"in v8 {string.Join("; and ", reasons)}";
        var metadataFile = AppFiles.Resolve(projectFolder, MetadataPath);
        if (metadataFile is null)
        {
            messages.Todo(
                $"Could not find {MetadataPath}; add \"onProcessEnd\": {{ \"confirm\": true }} to it: {inV8}."
            );
            return new MigrationResult(messages);
        }

        string text;
        bool hadBom;
        byte[] json;
        MetadataObject root;
        try
        {
            (text, hadBom) = Utf8TextFile.Decode(await File.ReadAllBytesAsync(metadataFile));
            json = Encoding.UTF8.GetBytes(text);
            root = ReadRoot(json);
        }
        catch (Exception ex) when (ex is DecoderFallbackException or JsonException or InvalidOperationException)
        {
            messages.Todo(
                $"Could not read {MetadataPath} ({ex.Message}); add \"onProcessEnd\": {{ \"confirm\": true }} to it "
                    + $"manually: {inV8}."
            );
            return new MigrationResult(messages);
        }

        byte[] edited;
        var onProcessEnd = root.Find(PropertyName);
        if (onProcessEnd is null)
        {
            edited = AddProperty(json, root, $"\"{PropertyName}\": {{ \"{ConfirmName}\": true }}");
        }
        else if (onProcessEnd.Object is not { } settings)
        {
            messages.Todo(
                $"{MetadataPath} has an onProcessEnd that is not an object ({Raw(json, onProcessEnd)}). Left it as it "
                    + $"is; make it {{ \"confirm\": true }}: {inV8}."
            );
            return new MigrationResult(messages);
        }
        else if (settings.Find(ConfirmName) is { } confirm)
        {
            if (confirm.Kind == JsonTokenType.True)
            {
                messages.Ok(
                    $"{MetadataPath} already sets onProcessEnd.confirm, so the app keeps confirming instances: {inV8}."
                );
            }
            else
            {
                // Only someone who has already upgraded the app writes onProcessEnd, so this is their choice.
                messages.Warn(
                    $"{MetadataPath} sets onProcessEnd.confirm to {Raw(json, confirm)}, so the v9 app does not "
                        + $"confirm instances as complete, while {inV8}. Left it as it is; set it to true if the "
                        + "service owner relies on the confirmation."
                );
            }
            return new MigrationResult(messages);
        }
        else
        {
            edited = AddProperty(json, settings, $"\"{ConfirmName}\": true");
        }

        await Utf8TextFile.Write(metadataFile, Encoding.UTF8.GetString(edited), hadBom);
        messages.Ok(
            $"Set onProcessEnd.confirm in {MetadataPath}: {inV8}. The v9 tasks do not confirm, so the app confirms "
                + "the instance as complete when the process ends instead."
        );
        return new MigrationResult(messages);
    }

    /// <summary>What confirmed the app's instances in v8, one phrase per task; empty when nothing did.</summary>
    private static List<string> ReasonsToConfirm(string projectFolder, List<UpgradeMessage> messages)
    {
        var processFile = AppFiles.Resolve(projectFolder, "config/process/process.bpmn");
        if (processFile is null)
            return [];

        XDocument doc;
        try
        {
            doc = XDocument.Parse(Utf8TextFile.Decode(File.ReadAllBytes(processFile)).Text);
        }
        catch (Exception ex) when (ex is XmlException or DecoderFallbackException)
        {
            messages.Warn(
                $"Could not parse config/process/process.bpmn ({ex.Message}); skipped checking whether the app "
                    + "confirmed instances in v8."
            );
            return [];
        }

        var eFormidlingTasks = new List<XElement>();
        var fiksArkivTasks = new List<string>();
        foreach (
            var task in doc.Root?.Elements().Where(e => e.Name.LocalName == "process").SelectMany(p => p.Elements())
                ?? []
        )
        {
            var extension = task.Elements()
                .FirstOrDefault(e => e.Name.LocalName == "extensionElements")
                ?.Element(_altinnNs + "taskExtension");
            var taskType = extension?.Element(_altinnNs + "taskType")?.Value.Trim();
            if (extension is null || task.Attribute("id")?.Value is not { } taskId)
                continue;

            if (string.Equals(taskType, "eFormidling", StringComparison.OrdinalIgnoreCase))
                eFormidlingTasks.Add(task);
            else if (string.Equals(taskType, "fiksArkiv", StringComparison.OrdinalIgnoreCase))
                fiksArkivTasks.Add(taskId);
        }

        var reasons = new List<string>();
        var sending = eFormidlingTasks.Where(task => !IsDisabledEverywhere(task)).ToList();
        foreach (var task in sending)
        {
            reasons.Add(
                $"the eFormidling task '{task.Attribute("id")?.Value}' confirmed the instance as complete once the "
                    + "shipment was delivered"
            );
        }

        if (fiksArkivTasks.Count > 0)
        {
            var (on, off) = ReadMarkInstanceComplete(projectFolder);
            if (on.Count > 0)
            {
                foreach (var taskId in fiksArkivTasks)
                {
                    reasons.Add(
                        $"the Fiks Arkiv task '{taskId}' confirmed the instance as complete once the archive confirmed "
                            + $"the record, with MarkInstanceComplete on in {string.Join(", ", on)}"
                    );
                }
                if (off.Count > 0)
                {
                    messages.Warn(
                        $"MarkInstanceComplete was off in {string.Join(", ", off)}, so the Fiks Arkiv task did not "
                            + "confirm instances in those environments. onProcessEnd.confirm applies in every "
                            + "environment."
                    );
                }
            }
        }

        if (reasons.Count == 0 && eFormidlingTasks.Count > 0)
        {
            var ids = string.Join(", ", eFormidlingTasks.Select(task => $"'{task.Attribute("id")?.Value}'"));
            messages.Warn(
                $"The eFormidling task(s) {ids} are disabled in every environment, so in v8 they sent nothing and "
                    + "confirmed nothing, and onProcessEnd.confirm was not set. When you enable one, also set "
                    + $"\"onProcessEnd\": {{ \"confirm\": true }} in {MetadataPath} to confirm instances as complete, "
                    + "as v8 did once a shipment was delivered."
            );
        }

        return reasons;
    }

    /// <summary>
    /// Whether <c>&lt;altinn:disabled&gt;</c> turns the eFormidling task off in every environment: the element without
    /// an environment says true, and no environment-specific one says otherwise.
    /// </summary>
    private static bool IsDisabledEverywhere(XElement task)
    {
        var disabled = task.Descendants(_altinnNs + "disabled").ToList();
        bool IsTrue(XElement element) => bool.TryParse(element.Value.Trim(), out var value) && value;
        bool HasEnvironment(XElement element) => !string.IsNullOrWhiteSpace(element.Attribute("env")?.Value);

        return disabled.Exists(element => !HasEnvironment(element) && IsTrue(element))
            && disabled.Where(HasEnvironment).All(IsTrue);
    }

    /// <summary>
    /// The appsettings files that set <c>SuccessHandling:MarkInstanceComplete</c> on and off. Keys are matched ignoring
    /// case and values may be strings, as the configuration binder reads them.
    /// </summary>
    private static (List<string> On, List<string> Off) ReadMarkInstanceComplete(string projectFolder)
    {
        var appFolder = Path.Combine(projectFolder, "App");
        if (!Directory.Exists(appFolder))
            appFolder = projectFolder;

        var on = new List<string>();
        var off = new List<string>();
        foreach (var file in Directory.EnumerateFiles(appFolder, "appsettings*.json").Order(StringComparer.Ordinal))
        {
            JsonDocument doc;
            try
            {
                doc = JsonDocument.Parse(Utf8TextFile.Decode(File.ReadAllBytes(file)).Text, _settingsOptions);
            }
            catch (Exception ex) when (ex is JsonException or DecoderFallbackException)
            {
                continue;
            }

            using (doc)
            {
                var flags = MarkInstanceCompleteValues(doc.RootElement).ToList();
                if (flags.Contains(true))
                    on.Add(Path.GetFileName(file));
                else if (flags.Contains(false))
                    off.Add(Path.GetFileName(file));
            }
        }

        return (on, off);
    }

    /// <summary>
    /// The <c>MarkInstanceComplete</c> values in every <c>SuccessHandling</c> object, the objects the Fiks Arkiv
    /// settings step removes it from. An app can bind the Fiks Arkiv settings from a section of any name.
    /// </summary>
    private static IEnumerable<bool> MarkInstanceCompleteValues(JsonElement element)
    {
        if (element.ValueKind == JsonValueKind.Array)
            return element.EnumerateArray().SelectMany(MarkInstanceCompleteValues);
        if (element.ValueKind != JsonValueKind.Object)
            return [];

        var values = new List<bool>();
        foreach (var property in element.EnumerateObject())
        {
            if (
                property.Name.Equals("SuccessHandling", StringComparison.OrdinalIgnoreCase)
                && property.Value.ValueKind == JsonValueKind.Object
            )
            {
                values.AddRange(
                    property
                        .Value.EnumerateObject()
                        .Where(setting =>
                            setting.Name.Equals("MarkInstanceComplete", StringComparison.OrdinalIgnoreCase)
                        )
                        .Select(setting => AsBool(setting.Value))
                        .OfType<bool>()
                );
            }
            values.AddRange(MarkInstanceCompleteValues(property.Value));
        }
        return values;
    }

    private static bool? AsBool(JsonElement value) =>
        value.ValueKind switch
        {
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            JsonValueKind.String when bool.TryParse(value.GetString(), out var parsed) => parsed,
            _ => null,
        };

    /// <summary>
    /// Adds <paramref name="property"/> after the object's last property, on a line of its own indented like the first
    /// property when that one starts its line, otherwise on the same line. An empty object gets it inline.
    /// </summary>
    private static byte[] AddProperty(byte[] json, MetadataObject target, string property)
    {
        if (target.FirstPropertyStart is not { } first || target.LastValueEnd is not { } last)
            return Splice(json, target.Start, target.End + 1, $"{{ {property} }}");

        var newline = json.AsSpan().IndexOf("\r\n"u8) >= 0 ? "\r\n" : "\n";
        var insertion = LineIndent(json, first) is { } indent ? $",{newline}{indent}{property}" : $", {property}";
        return Splice(json, last, last, insertion);
    }

    /// <summary>The whitespace before <paramref name="position"/> on its line, or null when anything else is there.</summary>
    private static string? LineIndent(byte[] json, int position)
    {
        var start = position;
        while (start > 0 && json[start - 1] is (byte)' ' or (byte)'\t')
            start--;
        return start == 0 || json[start - 1] == (byte)'\n'
            ? Encoding.UTF8.GetString(json, start, position - start)
            : null;
    }

    private static byte[] Splice(byte[] json, int start, int end, string replacement) =>
        [.. json.AsSpan(0, start), .. Encoding.UTF8.GetBytes(replacement), .. json.AsSpan(end)];

    private static string Raw(byte[] json, MetadataProperty property) =>
        Encoding.UTF8.GetString(json, property.ValueStart, property.ValueEnd - property.ValueStart);

    /// <summary>Reads the root object, and the <c>onProcessEnd</c> object in it.</summary>
    private static MetadataObject ReadRoot(byte[] json)
    {
        var reader = new Utf8JsonReader(json, _metadataOptions);
        if (!reader.Read() || reader.TokenType != JsonTokenType.StartObject)
            throw new JsonException("The root is not an object.");
        var root = ReadObject(ref reader, descend: true);
        if (reader.Read())
            throw new JsonException("The file has content after the root object.");
        return root;
    }

    /// <summary>Reads the object the reader is on, leaving the reader on its end.</summary>
    private static MetadataObject ReadObject(ref Utf8JsonReader reader, bool descend)
    {
        var layout = new MetadataObject((int)reader.TokenStartIndex);
        while (reader.Read() && reader.TokenType == JsonTokenType.PropertyName)
        {
            var name = reader.GetString() ?? "";
            layout.FirstPropertyStart ??= (int)reader.TokenStartIndex;
            reader.Read();
            var valueStart = (int)reader.TokenStartIndex;
            var kind = reader.TokenType;
            MetadataObject? nested = null;
            if (descend && kind == JsonTokenType.StartObject && IsProperty(name, PropertyName))
                nested = ReadObject(ref reader, descend: false);
            else
                reader.Skip();
            var valueEnd = (int)reader.BytesConsumed;
            layout.Properties.Add(new MetadataProperty(name, kind, valueStart, valueEnd, nested));
            layout.LastValueEnd = valueEnd;
        }
        layout.End = (int)reader.TokenStartIndex;
        return layout;
    }

    // The app matches the property names in applicationmetadata.json ignoring case.
    private static bool IsProperty(string? name, string expected) =>
        string.Equals(name, expected, StringComparison.OrdinalIgnoreCase);

    private sealed record MetadataProperty(
        string Name,
        JsonTokenType Kind,
        int ValueStart,
        int ValueEnd,
        MetadataObject? Object
    );

    private sealed class MetadataObject(int start)
    {
        public int Start { get; } = start;
        public int End { get; set; }
        public int? FirstPropertyStart { get; set; }
        public int? LastValueEnd { get; set; }
        public List<MetadataProperty> Properties { get; } = [];

        public MetadataProperty? Find(string name) => Properties.Find(property => IsProperty(property.Name, name));
    }
}
