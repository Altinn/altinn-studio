using System.Xml.Serialization;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;

namespace Altinn.App.Core.Internal.Process.Elements
{
    /// <summary>
    /// Class representing the extension elements
    /// </summary>
    public class ExtensionElements
    {
        /// <summary>
        /// Gets or sets the altinn properties
        /// </summary>
        [XmlElement("properties", Namespace = "http://altinn.no")]
        public AltinnProperties? AltinnProperties { get; set; }
    }
}
