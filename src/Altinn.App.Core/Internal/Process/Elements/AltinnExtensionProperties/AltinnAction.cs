using System.Xml.Serialization;

namespace Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties
{
    /// <summary>
    /// Defines an altinn action for a task
    /// </summary>
    public class AltinnAction
    {
        /// <summary>
        /// Gets or sets the ID of the action
        /// </summary>
        [XmlAttribute("id")]
        public string Id { get; set; }
    }
}
