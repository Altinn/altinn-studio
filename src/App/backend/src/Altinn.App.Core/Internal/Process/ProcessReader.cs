using System.Diagnostics.CodeAnalysis;
using System.Xml.Serialization;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Process.Elements.Base;

namespace Altinn.App.Core.Internal.Process;

/// <summary>
/// Implementation of <see cref="IProcessReader"/> that reads from a <see cref="Definitions"/>
/// </summary>
public class ProcessReader : IProcessReader
{
    private readonly Definitions _definitions;
    private readonly Telemetry? _telemetry;

    /// <summary>
    /// Create instance of ProcessReader where process stream is fetched from <see cref="IProcessClient"/>
    /// </summary>
    /// <param name="processClient">Implementation of IProcessClient used to get stream of BPMN process</param>
    /// <param name="telemetry">Telemetry for metrics and traces.</param>
    /// <exception cref="InvalidOperationException">If BPMN file could not be deserialized</exception>
    public ProcessReader(IProcessClient processClient, Telemetry? telemetry = null)
    {
        XmlSerializer serializer = new XmlSerializer(typeof(Definitions));
        // TODO: IO should be async
        using var stream = processClient.GetProcessDefinition();
#pragma warning disable CA5369 // Use XmlReader for 'XmlSerializer.Deserialize()'
        // NOTE: this is trusted XML input, as it comes from the apps own code
        Definitions? definitions = (Definitions?)serializer.Deserialize(stream);
#pragma warning restore CA5369 // Use XmlReader for 'XmlSerializer.Deserialize()'

        _definitions =
            definitions
            ?? throw new InvalidOperationException("Failed to deserialize BPMN definitions. Definitions was null");
        _telemetry = telemetry;
    }

    /// <inheritdoc />
    public List<StartEvent> GetStartEvents()
    {
        using var activity = _telemetry?.StartGetStartEventsActivity();
        return _definitions.Process.StartEvents;
    }

    /// <inheritdoc />
    public List<string> GetStartEventIds()
    {
        using var activity = _telemetry?.StartGetStartEventIdsActivity();
        return GetStartEvents().Select(s => s.Id).ToList();
    }

    /// <inheritdoc />
    public bool IsStartEvent([NotNullWhen(true)] string? elementId)
    {
        using var activity = _telemetry?.StartIsStartEventActivity();
        return elementId != null && GetStartEventIds().Contains(elementId);
    }

    /// <inheritdoc />
    public List<ProcessTask> GetProcessTasks()
    {
        using var activity = _telemetry?.StartGetProcessTasksActivity();
        return [.. _definitions.Process.Tasks, .. _definitions.Process.ServiceTasks];
    }

    /// <inheritdoc />
    public List<string> GetProcessTaskIds()
    {
        using var activity = _telemetry?.StartGetProcessTaskIdsActivity();
        return GetProcessTasks().Select(t => t.Id).ToList();
    }

    /// <inheritdoc />
    public bool IsProcessTask([NotNullWhen(true)] string? elementId)
    {
        using var activity = _telemetry?.StartIsProcessTaskActivity();
        return elementId != null && GetProcessTaskIds().Contains(elementId);
    }

    /// <inheritdoc />
    public List<ExclusiveGateway> GetExclusiveGateways()
    {
        using var activity = _telemetry?.StartGetExclusiveGatewaysActivity();
        return _definitions.Process.ExclusiveGateway;
    }

    /// <inheritdoc />
    public List<string> GetExclusiveGatewayIds()
    {
        using var activity = _telemetry?.StartGetExclusiveGatewayIdsActivity();
        return GetExclusiveGateways().Select(g => g.Id).ToList();
    }

    /// <inheritdoc />
    public List<EndEvent> GetEndEvents()
    {
        using var activity = _telemetry?.StartGetEndEventsActivity();
        return _definitions.Process.EndEvents;
    }

    /// <inheritdoc />
    public List<string> GetEndEventIds()
    {
        using var activity = _telemetry?.StartGetEndEventIdsActivity();
        return GetEndEvents().Select(e => e.Id).ToList();
    }

    /// <inheritdoc />
    public bool IsEndEvent([NotNullWhen(true)] string? elementId)
    {
        using var activity = _telemetry?.StartIsEndEventActivity();
        return elementId != null && GetEndEventIds().Contains(elementId);
    }

    /// <inheritdoc />
    public List<SequenceFlow> GetSequenceFlows()
    {
        using var activity = _telemetry?.StartGetSequenceFlowsActivity();
        return _definitions.Process.SequenceFlow;
    }

    /// <inheritdoc />
    public List<string> GetSequenceFlowIds()
    {
        using var activity = _telemetry?.StartGetSequenceFlowIdsActivity();
        return GetSequenceFlows().Select(s => s.Id).ToList();
    }

    /// <inheritdoc />
    public ProcessElement? GetFlowElement(string? elementId)
    {
        using var activity = _telemetry?.StartGetFlowElementActivity();
        ArgumentNullException.ThrowIfNull(elementId);

        ProcessTask? task = _definitions.Process.Tasks.Find(t => t.Id == elementId);
        if (task is not null)
        {
            return task;
        }

        ServiceTask? serviceTask = _definitions.Process.ServiceTasks?.Find(t => t.Id == elementId);
        if (serviceTask is not null)
        {
            return serviceTask;
        }

        EndEvent? endEvent = _definitions.Process.EndEvents.Find(e => e.Id == elementId);
        if (endEvent is not null)
        {
            return endEvent;
        }

        StartEvent? startEvent = _definitions.Process.StartEvents.Find(e => e.Id == elementId);
        if (startEvent is not null)
        {
            return startEvent;
        }

        return _definitions.Process.ExclusiveGateway.Find(e => e.Id == elementId);
    }

    /// <inheritdoc />
    public List<ProcessElement> GetNextElements(string? currentElementId)
    {
        using var activity = _telemetry?.StartGetNextElementsActivity();
        ArgumentNullException.ThrowIfNull(currentElementId);
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
        using var activity = _telemetry?.StartGetOutgoingSequenceFlowsActivity();
        if (flowElement == null)
        {
            return new List<SequenceFlow>();
        }

        return GetSequenceFlows().FindAll(sf => flowElement.Outgoing.Contains(sf.Id)).ToList();
    }

    /// <inheritdoc />
    public List<ProcessElement> GetAllFlowElements()
    {
        using var activity = _telemetry?.StartGetAllFlowElementsActivity();
        List<ProcessElement> flowElements = new List<ProcessElement>();
        flowElements.AddRange(GetStartEvents());
        flowElements.AddRange(GetProcessTasks());
        flowElements.AddRange(GetExclusiveGateways());
        flowElements.AddRange(GetEndEvents());
        return flowElements;
    }

    /// <inheritdoc />
    public AltinnTaskExtension? GetAltinnTaskExtension(string elementId)
    {
        using var activity = _telemetry?.StartGetAltinnTaskExtensionActivity();
        ProcessElement? flowElement = GetFlowElement(elementId);

        if (flowElement is ProcessTask processTask)
        {
            return processTask.ExtensionElements?.TaskExtension
                ?? throw new ProcessException("No AltinnTaskExtension found on task");
        }

        return null;
    }
}
