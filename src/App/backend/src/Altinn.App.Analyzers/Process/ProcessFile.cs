using System.Xml;
using System.Xml.Linq;

namespace Altinn.App.Analyzers.Process;

/// <summary>
/// Reads <c>config/process/process.bpmn</c> from the analysis's additional files, the way the process analyzers
/// share it.
/// </summary>
internal static class ProcessFile
{
    internal const string RelativePath = "config/process/process.bpmn";

    /// <summary>The namespaces the app runtime binds to when it reads the process.</summary>
    internal static readonly XNamespace Bpmn = "http://www.omg.org/spec/BPMN/20100524/MODEL";

    /// <inheritdoc cref="Bpmn"/>
    internal static readonly XNamespace Altinn = "http://altinn.no/process";

    /// <summary>The element of a task that is not a service task.</summary>
    internal static readonly XName Task = Bpmn + "task";

    /// <summary>The element of a service task.</summary>
    internal static readonly XName ServiceTask = Bpmn + "serviceTask";

    /// <summary>
    /// The app's process file. More than one means a project layout this analysis cannot reason about, so it
    /// stays quiet rather than guessing.
    /// </summary>
    internal static AdditionalText? FindSingle(ImmutableArray<AdditionalText> additionalFiles)
    {
        AdditionalText? found = null;
        foreach (var file in additionalFiles)
        {
            if (!NormalizedPath(file).EndsWith(RelativePath, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            if (found is not null)
            {
                return null;
            }

            found = file;
        }

        return found;
    }

    /// <summary>
    /// The process file's text and its document with line info, or null when it cannot be read or is not valid
    /// XML. There is nothing to reason about then; the app itself fails to load the process at startup.
    /// </summary>
    internal static (string Content, XDocument Document)? TryParse(AdditionalText processFile, CancellationToken token)
    {
        var content = processFile.GetText(token)?.ToString();
        if (content is null)
        {
            return null;
        }

        try
        {
            return (content, XDocument.Parse(content, LoadOptions.SetLineInfo));
        }
        catch (XmlException)
        {
            return null;
        }
    }

    /// <summary>
    /// The task an <c>altinn:taskType</c> belongs to: the nearest enclosing <c>bpmn:task</c> or
    /// <c>bpmn:serviceTask</c>. Those are the only two elements that can carry a task extension (see
    /// <c>Process.cs</c> in Altinn.App.Core, which models the process's element set).
    /// </summary>
    internal static XElement? FindHostingTask(XElement taskType) =>
        taskType.Ancestors().FirstOrDefault(a => a.Name == Task || a.Name == ServiceTask);

    internal static string NormalizedPath(AdditionalText file) => file.Path.Replace('\\', '/');
}
