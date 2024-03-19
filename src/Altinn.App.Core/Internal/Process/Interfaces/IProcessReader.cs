using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Process.Elements.Base;

namespace Altinn.App.Core.Internal.Process;

/// <summary>
/// Interface for classes that reads the applications process
/// </summary>
public interface IProcessReader
{
    /// <summary>
    /// Get all defined StartEvents in the process
    /// </summary>
    /// <returns></returns>
    public List<StartEvent> GetStartEvents();

    /// <summary>
    /// Get ids of all defined StartEvents in the process
    /// </summary>
    /// <returns></returns>
    public List<string> GetStartEventIds();

    /// <summary>
    /// Check id element is StartEvent
    /// </summary>
    /// <param name="elementId">Id of process element</param>
    /// <returns>true if elementId is of type StartEvent</returns>
    public bool IsStartEvent(string? elementId);

    /// <summary>
    /// Get all defined Tasks in the process
    /// </summary>
    /// <returns></returns>
    public List<ProcessTask> GetProcessTasks();

    /// <summary>
    /// Get ids of all defined Tasks in the process
    /// </summary>
    /// <returns></returns>
    public List<string> GetProcessTaskIds();

    /// <summary>
    /// Check id element is ProcessTask
    /// </summary>
    /// <param name="elementId">Id of process element</param>
    /// <returns>true if elementId is of type Task</returns>
    public bool IsProcessTask(string? elementId);

    /// <summary>
    /// Get all ExclusiveGateways defined in the process
    /// </summary>
    /// <returns></returns>
    public List<ExclusiveGateway> GetExclusiveGateways();

    /// <summary>
    /// Get ids of all defined ExclusiveGateways in the process
    /// </summary>
    /// <returns></returns>
    public List<string> GetExclusiveGatewayIds();

    /// <summary>
    /// Get all EndEvents defined in the process
    /// </summary>
    /// <returns></returns>
    public List<EndEvent> GetEndEvents();

    /// <summary>
    /// Get ids of all EndEvents defined in the process
    /// </summary>
    /// <returns></returns>
    public List<string> GetEndEventIds();

    /// <summary>
    /// Check id element is EndEvent
    /// </summary>
    /// <param name="elementId">Id of process element</param>
    /// <returns>true if elementId is of type EndEvent</returns>
    public bool IsEndEvent(string? elementId);

    /// <summary>
    /// Get all SequenceFlows defined in the process
    /// </summary>
    /// <returns></returns>
    public List<SequenceFlow> GetSequenceFlows();

    /// <summary>
    /// Get SequenceFlows out of the bpmn element
    /// </summary>
    /// <param name="flowElement">Element to get the outgoing sequenceflows from</param>
    /// <returns>Outgoing sequence flows</returns>
    public List<SequenceFlow> GetOutgoingSequenceFlows(ProcessElement? flowElement);

    /// <summary>
    /// Get ids of all SequenceFlows defined in the process
    /// </summary>
    /// <returns></returns>
    public List<string> GetSequenceFlowIds();

    /// <summary>
    /// Find all possible next elements from current element
    /// </summary>
    /// <param name="currentElementId">Current process element id</param>
    /// <returns></returns>
    public List<ProcessElement> GetNextElements(string? currentElementId);

    /// <summary>
    /// Returns StartEvent, Task or EndEvent with given Id, null if element not found
    /// </summary>
    /// <param name="elementId">Id of element to look for</param>
    /// <returns><see cref="ProcessElement"/> or null</returns>
    public ProcessElement? GetFlowElement(string? elementId);

    /// <summary>
    /// Returns all available ProcessElements
    /// </summary>
    /// <returns><see cref="ProcessElement"/></returns>
    public List<ProcessElement> GetAllFlowElements();

    /// <summary>
    /// If the element with the given elementId is a ProcessTask, this method will return the AltinnTaskExtension for that task. If it is not, null is returned.
    /// </summary>
    public AltinnTaskExtension? GetAltinnTaskExtension(string elementId);
}
