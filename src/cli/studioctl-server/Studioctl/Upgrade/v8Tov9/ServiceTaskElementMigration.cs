using System.Text;
using System.Xml;
using System.Xml.Linq;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>
/// Changes every <c>bpmn:task</c> element in process.bpmn whose <c>altinn:taskType</c> is a built-in service task
/// type into a <c>bpmn:serviceTask</c>, the element v9 requires for those types: the build reports
/// <c>ALTINNAPP1003</c> and the app refuses to start otherwise. Only the tag names change, so the id, attributes,
/// children and the diagram, which refers to the task by id, stay as written. A custom task type is left alone,
/// since the process does not say whether the app implements it as a service task.
/// </summary>
internal static class ServiceTaskElementMigration
{
    private const string ProcessPath = "config/process/process.bpmn";
    private const string TaskName = "task";
    private const string ServiceTaskName = "serviceTask";

    private static readonly XNamespace _bpmnNs = "http://www.omg.org/spec/BPMN/20100524/MODEL";
    private static readonly XNamespace _altinnNs = "http://altinn.no/process";

    /// <summary>
    /// The types of <c>BuiltInTaskTypes.ServiceTasks</c> in Altinn.App.Analyzers. Compared as written, like the
    /// analyzer and the v9 app: a type that differs in case or whitespace resolves to no built-in task there.
    /// </summary>
    private static readonly IReadOnlySet<string> _builtInServiceTaskTypes = new HashSet<string>(StringComparer.Ordinal)
    {
        "pdf",
        "subformPdf",
        "eFormidling",
        "fiksArkiv",
    };

    public static async Task<MigrationResult> Migrate(string projectFolder)
    {
        var messages = new List<UpgradeMessage>();

        var processFile = AppFiles.Resolve(projectFolder, ProcessPath);
        if (processFile is null)
            return new MigrationResult(messages);

        string text;
        bool hadBom;
        XDocument document;
        try
        {
            (text, hadBom) = Utf8TextFile.Decode(await File.ReadAllBytesAsync(processFile));
            document = XDocument.Parse(text, LoadOptions.PreserveWhitespace | LoadOptions.SetLineInfo);
        }
        catch (Exception ex) when (ex is DecoderFallbackException or XmlException)
        {
            messages.Warn($"Could not read {ProcessPath} ({ex.Message}); skipped the service task element check.");
            return new MigrationResult(messages);
        }

        var tasks = document
            .Descendants(_bpmnNs + TaskName)
            .Select(task => (Element: task, Type: TaskType(task)))
            .Where(task => task.Type is not null && _builtInServiceTaskTypes.Contains(task.Type))
            .ToList();
        if (tasks.Count == 0)
            return new MigrationResult(messages);

        var described = string.Join(
            ", ",
            tasks.Select(task => $"'{task.Element.Attribute("id")?.Value ?? "<no id>"}' ({task.Type})")
        );

        var updated = RenameTags(text, tasks.Select(task => task.Element));
        foreach (var (element, _) in tasks)
            element.Name = _bpmnNs + ServiceTaskName;

        if (updated is null || !XNode.DeepEquals(document, Reparse(updated)))
        {
            messages.Todo(
                $"Could not change task(s) {described} in {ProcessPath} safely; left the file unchanged. Change "
                    + "each from bpmn:task to bpmn:serviceTask by hand: v9 does not build or start while a built-in "
                    + "service task type is on a bpmn:task element."
            );
            return new MigrationResult(messages);
        }

        await Utf8TextFile.Write(processFile, updated, hadBom);
        messages.Warn(
            $"Changed task(s) {described} in {ProcessPath} from bpmn:task to bpmn:serviceTask, the element v9 "
                + "requires for a built-in service task type."
        );
        return new MigrationResult(messages);
    }

    private static string? TaskType(XElement task) =>
        task.Element(_bpmnNs + "extensionElements")
            ?.Element(_altinnNs + "taskExtension")
            ?.Element(_altinnNs + "taskType")
            ?.Value;

    /// <summary>
    /// Renames the opening and closing tag of each task in <paramref name="text"/>, keeping its prefix, or returns
    /// null when a tag is not where the parser placed the element.
    /// </summary>
    private static string? RenameTags(string text, IEnumerable<XElement> tasks)
    {
        var lineStarts = LineStarts(text);
        var renames = new List<int>();
        foreach (var task in tasks)
        {
            if (task is not IXmlLineInfo { LineNumber: > 0 } lineInfo || lineInfo.LineNumber > lineStarts.Count)
                return null;

            // The reader places an element at the first character of its name, just after the '<'.
            var nameStart = lineStarts[lineInfo.LineNumber - 1] + lineInfo.LinePosition - 1;
            if (nameStart < 1 || nameStart >= text.Length || text[nameStart - 1] != '<')
                return null;

            var nameEnd = nameStart;
            while (nameEnd < text.Length && !char.IsWhiteSpace(text[nameEnd]) && text[nameEnd] is not ('/' or '>'))
                nameEnd++;
            var qualifiedName = text[nameStart..nameEnd];
            if (qualifiedName != TaskName && !qualifiedName.EndsWith(":" + TaskName, StringComparison.Ordinal))
                return null;

            // A task holds no other task, so the first closing tag of the same name after it is its own. A
            // look-alike in a comment or CDATA section is caught by the comparison after the edit.
            var closeStart = FindClosingTag(text, qualifiedName, nameEnd);
            if (closeStart < 0)
                return null;

            renames.Add(nameEnd - TaskName.Length);
            renames.Add(closeStart + 2 + qualifiedName.Length - TaskName.Length);
        }

        var result = new StringBuilder(text);
        foreach (var start in renames.OrderDescending())
        {
            result.Remove(start, TaskName.Length).Insert(start, ServiceTaskName);
        }
        return result.ToString();
    }

    private static int FindClosingTag(string text, string qualifiedName, int from)
    {
        var closing = "</" + qualifiedName;
        for (
            var index = text.IndexOf(closing, from, StringComparison.Ordinal);
            index >= 0;
            index = text.IndexOf(closing, index + 1, StringComparison.Ordinal)
        )
        {
            var after = index + closing.Length;
            if (after < text.Length && (char.IsWhiteSpace(text[after]) || text[after] == '>'))
                return index;
        }
        return -1;
    }

    /// <summary>
    /// The offset of each line, counting line breaks the way the XML reader does: <c>\r\n</c>, <c>\n</c> or a
    /// lone <c>\r</c>.
    /// </summary>
    private static List<int> LineStarts(string text)
    {
        var starts = new List<int> { 0 };
        for (var i = 0; i < text.Length; i++)
        {
            if (text[i] == '\n' || (text[i] == '\r' && (i + 1 == text.Length || text[i + 1] != '\n')))
                starts.Add(i + 1);
        }
        return starts;
    }

    private static XDocument? Reparse(string text)
    {
        try
        {
            return XDocument.Parse(text, LoadOptions.PreserveWhitespace);
        }
        catch (XmlException)
        {
            return null;
        }
    }
}
