using System.Xml.Serialization;

namespace Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties
{
    /// <summary>
    /// Defines the altinn properties for a task
    /// </summary>
    public class AltinnProperties
    {
        /// <summary>
        /// List of available actions for a task
        /// </summary>
        [XmlArray(ElementName = "actions", Namespace = "http://altinn.no", IsNullable = true)]
        [XmlArrayItem(ElementName = "action", Namespace = "http://altinn.no")]
        public List<AltinnAction>? AltinnActions { get; set; }

        /// <summary>
        /// Gets or sets the task type
        /// </summary>
        //[XmlElement(ElementName = "taskType", Namespace = "http://altinn.no", IsNullable = true)]
        [XmlElement("taskType", Namespace = "http://altinn.no")]
        public string? TaskType { get; set; }
    }
}