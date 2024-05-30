using System.Xml.Serialization;

namespace Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;

/// <summary>
/// Defines the altinn properties for a task
/// </summary>
public class AltinnGatewayExtension
{
    /// <summary>
    /// Gets or sets the data type id connected to the task
    /// </summary>
    [XmlElement("connectedDataTypeId", Namespace = "http://altinn.no/process", IsNullable = true)]
    public string? ConnectedDataTypeId { get; set; }
}
