using System.Text.Json;
using System.Xml;
using System.Xml.Linq;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.FiksArkivSettingsMigration;

/// <summary>
/// Removes the <c>moveToNextTask</c> setting from the Fiks Arkiv <c>successHandling</c> and
/// <c>errorHandling</c> blocks in the app's appsettings files, and says what changes where it was
/// <c>false</c>. A concluded Fiks Arkiv task in v9 always moves the process on: with the success action
/// once the archive confirms the record, and with the error action (<c>reject</c> by default) when the
/// archiving cannot succeed. The setting is gone from the v9 configuration model, so left in place the
/// configuration binder would ignore it silently, and an app that relied on <c>false</c> (stay put after a
/// receipt; fail the task on a rejection) has behavior to re-plan.
///
/// Also points out a Fiks Arkiv task that is not followed by an exclusive gateway: the v9 app refuses to
/// start until one separates a confirmed archiving from a rejected one. Advisory only, since adding a
/// gateway means deciding where a rejected case should go.
/// </summary>
internal sealed class FiksArkivSettingsMigrator
{
    private const string SettingName = "MoveToNextTask";
    private static readonly XNamespace _altinnNs = "http://altinn.no/process";

    private readonly string _projectFolder;

    public FiksArkivSettingsMigrator(string projectFolder)
    {
        _projectFolder = projectFolder;
    }

    /// <summary>
    /// Runs the migration. Warnings describe what was removed; a to-do means the app's behavior changes in
    /// v9 or its process needs work before the app starts. No messages means there was nothing to do.
    /// </summary>
    public async Task<MigrationResult> Migrate()
    {
        var messages = new List<UpgradeMessage>();

        foreach (var file in EnumerateAppSettingsFiles(ResolveAppFolder()))
        {
            await StripMoveToNextTask(file, messages);
        }

        AdviseOnProcessShape(messages);

        return new MigrationResult(messages);
    }

    /// <summary>
    /// Removes every whole-line <c>"moveToNextTask": true/false</c> property that sits directly inside a
    /// <c>successHandling</c> or <c>errorHandling</c> object, preserving the surrounding formatting (the same
    /// approach as the eFormidling and enablePdfCreation migrations). The parent is tracked by following the
    /// braces, so a same-named property elsewhere in the file is left alone. A property with unexpected
    /// formatting is left in place with a to-do. Verifies the result still parses before writing it.
    /// </summary>
    private static async Task StripMoveToNextTask(string file, List<UpgradeMessage> messages)
    {
        var original = await File.ReadAllTextAsync(file);
        if (!original.Contains(SettingName, StringComparison.OrdinalIgnoreCase))
            return;

        var fileName = Path.GetFileName(file);
        var lines = original.Split('\n');
        var kept = new List<string>(lines.Length);
        var owners = new Stack<string?>();
        var removed = new List<(string Handler, bool Value)>();

        for (var i = 0; i < lines.Length; i++)
        {
            var line = lines[i];
            var owner = owners.Count > 0 ? owners.Peek() : null;

            if (TryParseSettingLine(line, out var value))
            {
                if (owner is { } handler && IsHandler(handler))
                {
                    removed.Add((handler, value));
                    // Removing the last property of the object leaves a dangling comma on the previous one.
                    if (NextMeaningfulLine(lines, i).StartsWith('}') && kept.Count > 0)
                    {
                        var prev = kept[^1];
                        var content = prev.TrimEnd();
                        if (content.EndsWith(','))
                            kept[^1] = content[..^1] + prev[content.Length..];
                    }
                    continue;
                }
            }
            else if (line.Contains($"\"{SettingName}\"", StringComparison.OrdinalIgnoreCase))
            {
                messages.Todo(
                    $"Found {SettingName} on a line with unexpected formatting in {fileName} (line {i + 1}); left "
                        + "it in place. Remove it manually: the setting no longer exists in v9, and a Fiks Arkiv task "
                        + "always moves the process on when it concludes."
                );
            }

            TrackOwners(line, owners);
            kept.Add(line);
        }

        if (removed.Count == 0)
            return;

        var result = string.Join('\n', kept);
        try
        {
            using var _ = JsonDocument.Parse(result);
        }
        catch (JsonException ex)
        {
            messages.Todo(
                $"Removing {SettingName} from {fileName} would produce invalid JSON ({ex.Message}). Left the file "
                    + "unchanged; remove the setting manually, it no longer exists in v9."
            );
            return;
        }

        await File.WriteAllTextAsync(file, result);

        foreach (var (handler, value) in removed)
        {
            Report(messages, fileName, handler, value);
        }
    }

    private static void Report(List<UpgradeMessage> messages, string fileName, string handler, bool value)
    {
        var isSuccess = handler.Equals("SuccessHandling", StringComparison.OrdinalIgnoreCase);

        if (value)
        {
            messages.Warn(
                $"Removed {handler}:{SettingName} (true) from {fileName}. A Fiks Arkiv task in v9 always moves the "
                    + "process on when it concludes, so the setting no longer exists and the behavior is unchanged."
            );
            return;
        }

        if (isSuccess)
        {
            messages.Todo(
                $"Removed {handler}:{SettingName} (false) from {fileName}, and the behavior changes: in v8 the "
                    + "instance stayed on the Fiks Arkiv task after the archive confirmed the record, to be moved on "
                    + "by hand. In v9 the task always moves the process on with successHandling.action once the "
                    + "receipt arrives. Review what the instance was waiting for while it stayed put, and model it as "
                    + "a task after the Fiks Arkiv task if it is still needed."
            );
            return;
        }

        messages.Todo(
            $"Removed {handler}:{SettingName} (false) from {fileName}, and the behavior changes: in v8 a rejected "
                + "archiving failed the task and left the instance for manual follow-up. In v9 the task always moves "
                + "the process on with errorHandling.action ('reject' by default), so the process has to route that "
                + "action: make sure an exclusive gateway follows the Fiks Arkiv task with a flow for "
                + "[\"equals\", [\"gatewayAction\"], \"reject\"] to where someone follows the case up, and that the "
                + "service owner has the 'reject' right in policy.xml."
        );
    }

    /// <summary>
    /// Advisory: a Fiks Arkiv task must be followed by an exclusive gateway in v9, or the app refuses to
    /// start. Never rewrites the process, because where a rejected case should go is the app team's call.
    /// </summary>
    private void AdviseOnProcessShape(List<UpgradeMessage> messages)
    {
        var processFile = AppFiles.Resolve(_projectFolder, "config/process/process.bpmn");
        if (processFile is null)
            return;

        // Strict decode, same as the process rewriters: refuse non-UTF-8 rather than misread it, and strip
        // the BOM XDocument.Parse rejects.
        var (text, _) = Utf8TextFile.Decode(File.ReadAllBytes(processFile));
        XDocument doc;
        try
        {
            doc = XDocument.Parse(text);
        }
        catch (XmlException ex)
        {
            messages.Warn(
                $"Could not parse config/process/process.bpmn ({ex.Message}); skipped the Fiks Arkiv gateway check."
            );
            return;
        }

        foreach (var process in doc.Root?.Elements().Where(e => e.Name.LocalName == "process") ?? [])
        {
            var elementsById = new Dictionary<string, XElement>(StringComparer.Ordinal);
            foreach (var element in process.Elements())
            {
                if (element.Attribute("id")?.Value is { } id)
                    elementsById[id] = element;
            }

            var flows = new List<(string Source, string Target)>();
            foreach (var flow in process.Elements().Where(e => e.Name.LocalName == "sequenceFlow"))
            {
                if (
                    flow.Attribute("sourceRef")?.Value is { } source
                    && flow.Attribute("targetRef")?.Value is { } target
                )
                {
                    flows.Add((source, target));
                }
            }

            var fiksArkivTasks = process
                .Elements()
                .Where(e =>
                    e.Name.LocalName == "serviceTask"
                    && string.Equals(GetAltinnTaskType(e), "fiksArkiv", StringComparison.OrdinalIgnoreCase)
                )
                .Select(e => e.Attribute("id")?.Value)
                .OfType<string>();

            foreach (var taskId in fiksArkivTasks)
            {
                var targets = flows.Where(f => f.Source == taskId).Select(f => f.Target).ToList();
                var followedByGateway =
                    targets.Count > 0
                    && targets.All(t =>
                        elementsById.TryGetValue(t, out var target) && target.Name.LocalName == "exclusiveGateway"
                    );
                if (followedByGateway)
                    continue;

                messages.Todo(
                    $"The Fiks Arkiv task '{taskId}' is not followed by an exclusive gateway. In v9 the task always "
                        + "moves the process on when it concludes, with the success action once the archive confirms "
                        + "the record and with 'reject' when the archiving cannot succeed, and the app refuses to "
                        + "start until a gateway right after the task separates the two. Add an exclusive gateway "
                        + "with a default flow for the confirmed case and a flow with "
                        + "[\"equals\", [\"gatewayAction\"], \"reject\"] to where someone follows a rejected case up."
                );
            }
        }
    }

    private string ResolveAppFolder()
    {
        var appFolder = Path.Combine(_projectFolder, "App");
        return Directory.Exists(appFolder) ? appFolder : _projectFolder;
    }

    private static IEnumerable<string> EnumerateAppSettingsFiles(string appFolder)
    {
        if (!Directory.Exists(appFolder))
            return [];
        return Directory.EnumerateFiles(appFolder, "appsettings*.json", SearchOption.TopDirectoryOnly);
    }

    private static bool IsHandler(string? owner) =>
        owner is not null
        && (
            owner.Equals("SuccessHandling", StringComparison.OrdinalIgnoreCase)
            || owner.Equals("ErrorHandling", StringComparison.OrdinalIgnoreCase)
        );

    /// <summary>
    /// Matches a whole line of the form <c>"moveToNextTask": true,</c> (value true/false, quoted or not,
    /// comma optional) and nothing else, so removing the line cannot take other content with it.
    /// </summary>
    private static bool TryParseSettingLine(string line, out bool value)
    {
        value = false;
        var trimmed = line.Trim();
        var key = $"\"{SettingName}\"";
        if (!trimmed.StartsWith(key, StringComparison.OrdinalIgnoreCase))
            return false;

        var rest = trimmed[key.Length..].TrimStart();
        if (!rest.StartsWith(':'))
            return false;

        rest = rest[1..].TrimStart().TrimEnd(',').TrimEnd().Trim('"');
        if (!bool.TryParse(rest, out value))
            return false;
        return true;
    }

    /// <summary>
    /// Follows the braces on a line to know which property's object the following lines belong to. An
    /// object opened on a line that names a property (<c>"successHandling": {</c>) is owned by that
    /// property; any other <c>{</c> (an array item, a value on its own line) is anonymous. Braces inside
    /// strings are skipped.
    /// </summary>
    private static void TrackOwners(string line, Stack<string?> owners)
    {
        var trimmed = line.Trim();
        string? namedProperty = null;
        if (trimmed.StartsWith('"'))
        {
            var closingQuote = trimmed.IndexOf('"', 1);
            if (closingQuote > 0 && trimmed[(closingQuote + 1)..].TrimStart().StartsWith(':'))
                namedProperty = trimmed[1..closingQuote];
        }

        var inString = false;
        var firstOpenOnLine = true;
        var skipEscaped = false;
        foreach (var c in line)
        {
            if (skipEscaped)
            {
                skipEscaped = false;
                continue;
            }
            if (c == '\\' && inString)
            {
                skipEscaped = true;
                continue;
            }
            if (c == '"')
            {
                inString = !inString;
                continue;
            }
            if (inString)
                continue;

            if (c == '{')
            {
                owners.Push(firstOpenOnLine ? namedProperty : null);
                firstOpenOnLine = false;
            }
            else if (c == '}' && owners.Count > 0)
            {
                owners.Pop();
            }
        }
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

    private static string? GetAltinnTaskType(XElement task) =>
        task.Element(XName.Get("extensionElements", task.Name.NamespaceName))
            ?.Element(_altinnNs + "taskExtension")
            ?.Element(_altinnNs + "taskType")
            ?.Value.Trim();
}
