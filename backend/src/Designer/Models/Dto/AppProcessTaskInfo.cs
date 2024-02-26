using System.Xml.Serialization;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models.Dto;

/// <summary>
/// Representation of a task's id and type. Used by the frontend to determine which tasks
/// exist, and their type.
/// </summary>
public class AppProcessTaskTypeInfo
{
    /// <summary>
    /// Gets or sets the task type
    /// </summary>
    [XmlElement("altinnTaskType", Namespace = "http://altinn.no/process")]
    public string? AltinnTaskType { get; set; }


    /// <summary>
    /// Gets or sets a reference to the current task/event element id as given in the process definition.
    /// </summary>
    [JsonPropertyName(name: "elementId")]
    public string? ElementId { get; set; }
}
