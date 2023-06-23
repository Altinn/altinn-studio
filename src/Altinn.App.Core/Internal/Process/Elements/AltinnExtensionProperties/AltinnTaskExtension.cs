using System.Xml.Serialization;

namespace Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties
{
    /// <summary>
    /// Defines the altinn properties for a task
    /// </summary>
    public class AltinnTaskExtension
    {
        /// <summary>
        /// List of available actions for a task
        /// </summary>
        [XmlArray(ElementName = "actions", Namespace = "http://altinn.no/process", IsNullable = true)]
        [XmlArrayItem(ElementName = "action", Namespace = "http://altinn.no/process")]
        public List<AltinnAction>? AltinnActions { get; set; }

        /// <summary>
        /// Gets or sets the task type
        /// </summary>
        //[XmlElement(ElementName = "taskType", Namespace = "http://altinn.no/process/task", IsNullable = true)]
        [XmlElement("taskType", Namespace = "http://altinn.no/process")]
        public string? TaskType { get; set; }
        
        
        /// <summary>
        /// Gets or sets the configuration for signature
        /// </summary>
        [XmlElement("signatureConfig", Namespace = "http://altinn.no/process")]
        public AltinnSignatureConfiguration? SignatureConfiguration { get; set; } = new AltinnSignatureConfiguration();
    }
}
