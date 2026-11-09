using System.Xml.Linq;

namespace Altinn.Studio.Preview.AppApi;

/// <summary>
/// The tasks of the app's process and the flows between them, from <c>process.bpmn</c>. Preview follows the flows
/// without evaluating gateways: it takes a gateway's default flow, or else its first.
/// </summary>
internal sealed class ProcessDefinition
{
    // XML namespace names, which identify the elements and are never fetched.
#pragma warning disable S5332
    private static readonly XNamespace s_bpmn = "http://www.omg.org/spec/BPMN/20100524/MODEL";
    private static readonly XNamespace s_altinn = "http://altinn.no/process";
#pragma warning restore S5332

    private readonly Dictionary<string, ProcessTaskDefinition> _tasks;
    private readonly HashSet<string> _endEvents;
    private readonly Dictionary<string, string> _defaultFlows;
    private readonly Dictionary<string, (string Source, string Target)> _flows;
    private readonly ILookup<string, string> _outgoing;

    private ProcessDefinition(XElement process)
    {
        List<XElement> elements = [.. process.Elements()];
        Tasks =
        [
            .. elements
                .Where(element => element.Name.LocalName is "task" or "userTask" or "serviceTask")
                .Select(ToTask)
                .OfType<ProcessTaskDefinition>(),
        ];
        _tasks = Tasks.ToDictionary(task => task.ElementId, StringComparer.Ordinal);
        StartEvent = elements.Where(element => element.Name.LocalName == "startEvent").Select(Id).FirstOrDefault();
        _endEvents = [.. elements.Where(element => element.Name.LocalName == "endEvent").Select(Id).OfType<string>()];
        _defaultFlows = new Dictionary<string, string>(StringComparer.Ordinal);
        _flows = new Dictionary<string, (string Source, string Target)>(StringComparer.Ordinal);
        foreach (XElement element in elements)
        {
            if (Id(element) is not { } id)
            {
                continue;
            }

            if ((string?)element.Attribute("default") is { } defaultFlow)
            {
                _defaultFlows[id] = defaultFlow;
            }

            if (
                element.Name.LocalName == "sequenceFlow"
                && (string?)element.Attribute("sourceRef") is { } source
                && (string?)element.Attribute("targetRef") is { } target
            )
            {
                _flows[id] = (source, target);
            }
        }

        _outgoing = _flows.ToLookup(flow => flow.Value.Source, flow => flow.Key, StringComparer.Ordinal);
    }

    /// <summary>The tasks, in the order the process definition lists them.</summary>
    public IReadOnlyList<ProcessTaskDefinition> Tasks { get; }

    public string? StartEvent { get; }

    public static ProcessDefinition? From(XDocument bpmn) =>
        bpmn.Root?.Element(s_bpmn + "process") is { } process ? new ProcessDefinition(process) : null;

    public ProcessTaskDefinition? Task(string elementId) => _tasks.GetValueOrDefault(elementId);

    /// <summary>The first task of a new instance, or <c>null</c> when the start event leads to none.</summary>
    public ProcessStep? First() => StartEvent is null ? null : Next(StartEvent);

    /// <summary>
    /// Where the process goes from <paramref name="elementId"/>: the next task, or an end event. <c>null</c> when the
    /// flows lead nowhere.
    /// </summary>
    public ProcessStep? Next(string elementId)
    {
        HashSet<string> visited = [elementId];
        string current = elementId;
        while (NextElement(current) is { } next && visited.Add(next))
        {
            if (_tasks.TryGetValue(next, out ProcessTaskDefinition? task))
            {
                return new ProcessStep(task, EndEvent: null);
            }

            if (_endEvents.Contains(next))
            {
                return new ProcessStep(Task: null, EndEvent: next);
            }

            current = next;
        }

        return null;
    }

    private string? NextElement(string elementId)
    {
        string? flow = _defaultFlows.GetValueOrDefault(elementId) ?? _outgoing[elementId].FirstOrDefault();
        return flow is not null && _flows.TryGetValue(flow, out var target) ? target.Target : null;
    }

    private static string? Id(XElement element) => (string?)element.Attribute("id");

    private static ProcessTaskDefinition? ToTask(XElement element)
    {
        string? id = Id(element);
        // Newer apps put the task type in the extension elements, older ones in an attribute.
        string? taskType =
            element
                .Element(s_bpmn + "extensionElements")
                ?.Element(s_altinn + "taskExtension")
                ?.Element(s_altinn + "taskType")
                ?.Value
            ?? (string?)element.Attribute(s_altinn + "tasktype");
        if (id is null || taskType is null)
        {
            return null;
        }

        string elementType = element.Name.LocalName == "serviceTask" ? "ServiceTask" : "Task";
        return new ProcessTaskDefinition(id, (string?)element.Attribute("name") ?? id, taskType.Trim(), elementType);
    }
}

/// <summary>A task in the process definition.</summary>
/// <param name="ElementId">The task's ID, which the app's UI folder for the task is named after.</param>
/// <param name="Name">The task's name.</param>
/// <param name="AltinnTaskType">What the task is, such as <c>data</c>, <c>signing</c> or <c>pdf</c>.</param>
/// <param name="ElementType"><c>Task</c>, or <c>ServiceTask</c> for a task the app does without the user.</param>
internal sealed record ProcessTaskDefinition(string ElementId, string Name, string AltinnTaskType, string ElementType)
{
    public bool IsServiceTask => ElementType == "ServiceTask";
}

/// <summary>Where the process goes next: a task, or an end event.</summary>
internal sealed record ProcessStep(ProcessTaskDefinition? Task, string? EndEvent);
