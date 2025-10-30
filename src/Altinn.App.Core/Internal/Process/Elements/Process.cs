using System.Xml.Serialization;

namespace Altinn.App.Core.Internal.Process.Elements;

/// <summary>
/// Class representing the process of a workflow
/// </summary>
public class Process
{
    /// <summary>
    /// Gets or sets the ID of the process of a workflow
    /// </summary>
    [XmlAttribute("id")]
#nullable disable
    public string Id { get; set; }

#nullable restore

    /// <summary>
    /// Gets or sets if the process of a workflow is executable or not
    /// </summary>
    [XmlAttribute("isExecutable")]
    public bool IsExecutable { get; set; }

    /// <summary>
    /// Gets or sets the start event of the process of a workflow
    /// </summary>
    [XmlElement("startEvent")]
#nullable disable
    public List<StartEvent> StartEvents { get; set; }

    /// <summary>
    /// Gets or sets the list of tasks for the process of a workflow
    /// </summary>
    [XmlElement("task")]
    public List<ProcessTask> Tasks { get; set; }

    /// <summary>
    /// Gets or sets the list of service tasks for the process of a workflow
    /// </summary>
    [XmlElement("serviceTask")]
    public List<ServiceTask> ServiceTasks { get; set; } = [];

    /// <summary>
    /// Gets or sets the end event of the process of a workflow
    /// </summary>
    [XmlElement("endEvent")]
    public List<EndEvent> EndEvents { get; set; }

    /// <summary>
    /// Gets or sets the sequence flow of the process of a workflow
    /// </summary>
    [XmlElement("sequenceFlow")]
    public List<SequenceFlow> SequenceFlow { get; set; }

    /// <summary>
    /// Gets or sets the exclusiveGateways of the process of a workflow
    /// </summary>
    [XmlElement("exclusiveGateway")]
    public List<ExclusiveGateway> ExclusiveGateway { get; set; }
#nullable restore
}
