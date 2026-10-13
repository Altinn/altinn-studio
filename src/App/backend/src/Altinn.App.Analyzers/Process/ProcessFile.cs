using System.Xml;
using System.Xml.Linq;
using Altinn.App.Analyzers.Utils;

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

    /// <summary>The process the runtime binds: the single one directly under the definitions.</summary>
    internal static readonly XName Process = Bpmn + "process";

    /// <summary>The element where an instance enters the process.</summary>
    internal static readonly XName StartEvent = Bpmn + "startEvent";

    /// <summary>The element where an instance leaves the process.</summary>
    internal static readonly XName EndEvent = Bpmn + "endEvent";

    /// <summary>The element that chooses one of the sequence flows it lists in <c>outgoing</c>.</summary>
    internal static readonly XName ExclusiveGateway = Bpmn + "exclusiveGateway";

    /// <summary>The element that connects the element its <c>sourceRef</c> names to the one its <c>targetRef</c> names.</summary>
    internal static readonly XName SequenceFlow = Bpmn + "sequenceFlow";

    /// <summary>A flow node's reference to a sequence flow that leaves it.</summary>
    internal static readonly XName Outgoing = Bpmn + "outgoing";

    /// <summary>A sequence flow's condition, which an exclusive gateway evaluates to choose the flow.</summary>
    internal static readonly XName ConditionExpression = Bpmn + "conditionExpression";

    /// <summary>The app's process file; see <see cref="AdditionalFiles.Single"/>.</summary>
    internal static AdditionalText? FindSingle(ImmutableArray<AdditionalText> additionalFiles) =>
        AdditionalFiles.Single(
            additionalFiles,
            file => NormalizedPath(file).EndsWith(RelativePath, StringComparison.OrdinalIgnoreCase)
        );

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
    /// The process the runtime binds, or null when the definitions hold none or more than one. With more than one,
    /// which the runtime reads is not worth guessing at.
    /// </summary>
    internal static XElement? SingleProcess(XDocument document)
    {
        var processes = document.Root?.Elements(Process).ToList();
        return processes is { Count: 1 } ? processes[0] : null;
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
