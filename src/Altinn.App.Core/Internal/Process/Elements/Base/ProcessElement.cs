using System.Xml.Serialization;

namespace Altinn.App.Core.Internal.Process.Elements.Base;

/// <summary>
/// Base for all flow elements in BPMN (startevent, taks, gateways, endevents)
/// </summary>
public abstract class ProcessElement
{
    /// <summary>
    /// Gets or sets the ID of a flow element
    /// </summary>
    [XmlAttribute("id")]
#nullable disable
    public string Id { get; set; }

    /// <summary>
    /// Gets or sets the name of a flow element
    /// </summary>
    [XmlAttribute("name")]
    public string Name { get; set; }

    /// <summary>
    /// Gets or sets the incoming id of a flow element
    /// </summary>
    [XmlElement("incoming")]
    public List<string> Incoming { get; set; }

    /// <summary>
    /// Gets or sets the outgoing id of a flow element
    /// </summary>
    [XmlElement("outgoing")]
    public List<string> Outgoing { get; set; }

#nullable restore

    /// <summary>
    /// String representation of process element type
    /// </summary>
    /// <returns></returns>
    public abstract string ElementType();
}
