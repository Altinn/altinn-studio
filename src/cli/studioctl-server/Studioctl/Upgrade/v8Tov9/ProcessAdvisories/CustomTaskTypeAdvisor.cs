using System.Text;
using System.Xml;
using System.Xml.Linq;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.ProcessAdvisories;

/// <summary>
/// Read-only advisory: names the task types in process.bpmn that no app library implements, so the app does. An
/// instance stores its current task's type, and ending or abandoning the task looks up the implementation by it, so
/// an instance started under v8 cannot finish a task whose class gets another type while it is ported to v9.
/// </summary>
internal static class CustomTaskTypeAdvisor
{
    private const string ProcessPath = "config/process/process.bpmn";
    private static readonly XNamespace _altinnNs = "http://altinn.no/process";

    /// <summary>
    /// Returns one warning naming every custom task type and the tasks that have it, or nothing when there are none.
    /// </summary>
    public static async Task<MigrationResult> Analyze(string projectFolder)
    {
        var messages = new List<UpgradeMessage>();

        var processFile = AppFiles.Resolve(projectFolder, ProcessPath);
        if (processFile is null)
            return new MigrationResult(messages);

        XDocument doc;
        try
        {
            var (text, _) = Utf8TextFile.Decode(await File.ReadAllBytesAsync(processFile));
            doc = XDocument.Parse(text);
        }
        catch (Exception ex) when (ex is DecoderFallbackException or XmlException)
        {
            messages.Todo(
                $"Could not read {ProcessPath} ({ex.Message}); skipped the check for custom task types. Fix the file "
                    + "and run the upgrade again."
            );
            return new MigrationResult(messages);
        }

        var customTypes = doc
            .Root?.Elements()
            .Where(e => e.Name.LocalName == "process")
            .Elements()
            .Select(task => (Id: task.Attribute("id")?.Value, Type: TaskType(task)))
            .Where(task => !string.IsNullOrEmpty(task.Type) && !IsBuiltIn(task.Type))
            .GroupBy(task => task.Type, StringComparer.Ordinal)
            .Select(group =>
            {
                var ids = group.Select(task => task.Id).OfType<string>().ToList();
                return ids.Count == 0 ? $"'{group.Key}'" : $"'{group.Key}' ({string.Join(", ", ids)})";
            })
            .ToList();
        if (customTypes is null or { Count: 0 })
            return new MigrationResult(messages);

        messages.Warn(
            $"The process uses the custom task type(s) {string.Join(", ", customTypes)}. Instances started under v8 "
                + "store their current task's type, so keep the same Type string when you port each task class to v9, "
                + "or those instances can't finish the task."
        );
        return new MigrationResult(messages);
    }

    private static bool IsBuiltIn(string taskType) =>
        BuiltInTaskTypes.ServiceTasks.Contains(taskType)
        || BuiltInTaskTypes.ProcessTasks.Contains(taskType)
        || taskType == BuiltInTaskTypes.NullType;

    private static string? TaskType(XElement task) =>
        task.Element(XName.Get("extensionElements", task.Name.NamespaceName))
            ?.Element(_altinnNs + "taskExtension")
            ?.Element(_altinnNs + "taskType")
            ?.Value.Trim();
}
