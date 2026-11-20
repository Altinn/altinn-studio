using System.Xml;
using System.Xml.Linq;

namespace Altinn.App.Analyzers.Authorization;

/// <summary>
/// What is read out of <c>config/process/process.bpmn</c> to decide which actions the app owner needs
/// beyond the unconditional baseline - deliberately only that, not a model of the process: nothing
/// here describes flows, gateways or events. Mirrors the record of the same name in the v8-to-v9
/// policy migrator, which reads the end events for the same purpose.
/// </summary>
internal sealed class ProcessInfo
{
    /// <summary>
    /// The namespaces the app runtime itself requires when it reads a process
    /// (<c>Process.cs</c> and <c>AltinnTaskExtension.cs</c> in Altinn.App.Core bind to exactly
    /// these). Matching on local names alone would let an unrelated <c>foo:taskType</c> from some
    /// other vendor extension invent requirements the runtime will never ask Storage to authorize.
    /// </summary>
    private static readonly XNamespace _bpmn = "http://www.omg.org/spec/BPMN/20100524/MODEL";

    /// <inheritdoc cref="_bpmn"/>
    private static readonly XNamespace _altinn = "http://altinn.no/process";

    private ProcessInfo(IReadOnlyList<string> taskTypes, HashSet<string> endEventIds)
    {
        TaskTypes = taskTypes;
        EndEventIds = endEventIds;
    }

    /// <summary>The <c>altinn:taskType</c> of every task, used to tell which actions the tasks add.</summary>
    internal IReadOnlyList<string> TaskTypes { get; }

    /// <summary>End event ids, used to accept <c>complete</c> grants scoped to a real end event.</summary>
    internal HashSet<string> EndEventIds { get; }

    /// <summary>Parses the process, or returns null when the document is not valid XML.</summary>
    internal static ProcessInfo? TryParse(string xml)
    {
        XDocument document;
        try
        {
            document = XDocument.Parse(xml);
        }
        catch (XmlException)
        {
            return null;
        }

        if (document.Root is null)
        {
            return null;
        }

        var endEventIds = new HashSet<string>(StringComparer.Ordinal);
        foreach (var endEvent in document.Descendants(_bpmn + "endEvent"))
        {
            if (endEvent.Attribute("id")?.Value is { Length: > 0 } id)
            {
                endEventIds.Add(id);
            }
        }

        var taskTypes = new List<string>();
        foreach (var taskType in document.Descendants(_altinn + "taskType"))
        {
            var type = taskType.Value.Trim();
            if (type.Length > 0)
            {
                taskTypes.Add(type);
            }
        }

        return new ProcessInfo(taskTypes, endEventIds);
    }
}
