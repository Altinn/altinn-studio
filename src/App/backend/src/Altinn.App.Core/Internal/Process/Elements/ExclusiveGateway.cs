using System.Xml.Serialization;
using Altinn.App.Core.Internal.Process.Elements.Base;

namespace Altinn.App.Core.Internal.Process.Elements;

/// <summary>
/// Represents an exclusive gateway from a BPMN process definition.
/// </summary>
public class ExclusiveGateway : ProcessElement
{
    /// <summary>
    /// Get or sets the default path of the exclusive gateway.
    /// </summary>
    [XmlAttribute("default")]
    public string? Default { get; set; }

    /// <summary>
    /// Gets or sets the extension elements of the exclusive gateway.
    /// </summary>
    [XmlElement("extensionElements")]
    public ExtensionElements? ExtensionElements { get; set; }

    /// <summary>
    /// String representation of process element type
    /// </summary>
    /// <returns>ExclusiveGateway</returns>
    public override string ElementType()
    {
        return "ExclusiveGateway";
    }
}
