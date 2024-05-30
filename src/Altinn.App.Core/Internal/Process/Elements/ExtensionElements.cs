using System.Xml.Serialization;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;

namespace Altinn.App.Core.Internal.Process.Elements;

/// <summary>
/// Class representing the extension elements
/// </summary>
public class ExtensionElements
{
    /// <summary>
    /// Gets or sets the altinn properties
    /// </summary>
    [XmlElement("taskExtension", Namespace = "http://altinn.no/process")]
    public AltinnTaskExtension? TaskExtension { get; set; }

    /// <summary>
    /// Gets or sets the altinn properties
    /// </summary>
    [XmlElement("gatewayExtension", Namespace = "http://altinn.no/process")]
    public AltinnGatewayExtension? GatewayExtension { get; set; }
}
