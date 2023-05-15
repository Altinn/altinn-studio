using System.Xml.Serialization;
using Altinn.App.Core.Interface;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.Base;

namespace Altinn.App.Core.Internal.Process;

/// <summary>
/// Implementation of <see cref="IProcessReader"/> that reads from a <see cref="Definitions"/>
/// </summary>
public class ProcessReader : IProcessReader
{
    private readonly Definitions _definitions;

    /// <summary>
    /// Create instance of ProcessReader where process stream is fetched from <see cref="IProcess"/>
    /// </summary>
    /// <param name="processService">Implementation of IProcess used to get stream of BPMN process</param>
    /// <exception cref="InvalidOperationException">If BPMN file could not be deserialized</exception>
    public ProcessReader(IProcess processService)
    {
        XmlSerializer serializer = new XmlSerializer(typeof(Definitions));
        Definitions? definitions = (Definitions?)serializer.Deserialize(processService.GetProcessDefinition());

        _definitions = definitions ?? throw new InvalidOperationException("Failed to deserialize BPMN definitions. Definitions was null");
    }

    /// <inheritdoc />
    public List<StartEvent> GetStartEvents()
    {
        return _definitions.Process.StartEvents;
    }

    /// <inheritdoc />
    public List<string> GetStartEventIds()
    {
        return GetStartEvents().Select(s => s.Id).ToList();
    }

    /// <inheritdoc />
    public bool IsStartEvent(string? elementId)
    {
        return elementId != null && GetStartEventIds().Contains(elementId);
    }

    /// <inheritdoc />
    public List<ProcessTask> GetProcessTasks()
    {
        return _definitions.Process.Tasks;
    }

    /// <inheritdoc />
    public List<string> GetProcessTaskIds()
    {
        return GetProcessTasks().Select(t => t.Id).ToList();
    }

    /// <inheritdoc />
    public bool IsProcessTask(string? elementId)
    {
        return elementId != null && GetProcessTaskIds().Contains(elementId);
    }

    /// <inheritdoc />
    public List<ExclusiveGateway> GetExclusiveGateways()
    {
        return _definitions.Process.ExclusiveGateway;
    }

    /// <inheritdoc />
    public List<string> GetExclusiveGatewayIds()
    {
        return GetExclusiveGateways().Select(g => g.Id).ToList();
    }

    /// <inheritdoc />
    public List<EndEvent> GetEndEvents()
    {
        return _definitions.Process.EndEvents;
    }

    /// <inheritdoc />
    public List<string> GetEndEventIds()
    {
        return GetEndEvents().Select(e => e.Id).ToList();
    }

    /// <inheritdoc />
    public bool IsEndEvent(string? elementId)
    {
        return elementId != null && GetEndEventIds().Contains(elementId);
    }

    /// <inheritdoc />
    public List<SequenceFlow> GetSequenceFlows()
    {
        return _definitions.Process.SequenceFlow;
    }

    /// <inheritdoc />
    public List<string> GetSequenceFlowIds()
    {
        return GetSequenceFlows().Select(s => s.Id).ToList();
    }

    /// <inheritdoc />
    public ProcessElement? GetFlowElement(string? elementId)
    {
        EnsureArgumentNotNull(elementId, nameof(elementId));

        ProcessTask? task = _definitions.Process.Tasks.Find(t => t.Id == elementId);
        if (task != null)
        {
            return task;
        }

        EndEvent? endEvent = _definitions.Process.EndEvents.Find(e => e.Id == elementId);
        if (endEvent != null)
        {
            return endEvent;
        }

        StartEvent? startEvent = _definitions.Process.StartEvents.Find(e => e.Id == elementId);
        if (startEvent != null)
        {
            return startEvent;
        }

        return _definitions.Process.ExclusiveGateway.Find(e => e.Id == elementId);
    }
    
    /// <inheritdoc />
    public List<ProcessElement> GetNextElements(string? currentElementId)
    {
        EnsureArgumentNotNull(currentElementId, nameof(currentElementId));
        List<ProcessElement> nextElements = new List<ProcessElement>();
        List<ProcessElement> allElements = GetAllFlowElements();
        if (!allElements.Exists(e => e.Id == currentElementId))
        {
            throw new ProcessException($"Unable to find a element using element id {currentElementId}.");
        }

        foreach (SequenceFlow sequenceFlow in GetSequenceFlows().FindAll(s => s.SourceRef == currentElementId))
        {
            nextElements.AddRange(allElements.FindAll(e => sequenceFlow.TargetRef == e.Id));
        }

        return nextElements;
    }

    /// <inheritdoc />
    public List<SequenceFlow> GetOutgoingSequenceFlows(ProcessElement? flowElement)
    {
        if (flowElement == null)
        {
            return new List<SequenceFlow>();
        }

        return GetSequenceFlows().FindAll(sf => flowElement.Outgoing.Contains(sf.Id)).ToList();
    }
    
    private static void EnsureArgumentNotNull(object? argument, string paramName)
    {
        if (argument == null)
            throw new ArgumentNullException(paramName);
    }
    
    private List<ProcessElement> GetAllFlowElements()
    {
        List<ProcessElement> flowElements = new List<ProcessElement>();
        flowElements.AddRange(GetStartEvents());
        flowElements.AddRange(GetProcessTasks());
        flowElements.AddRange(GetExclusiveGateways());
        flowElements.AddRange(GetEndEvents());
        return flowElements;
    }
}
