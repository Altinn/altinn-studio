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
        /// Define what taskId that should be signed for signing tasks
        /// </summary>
        [XmlArray(ElementName = "dataTypesToSign", Namespace = "http://altinn.no/process", IsNullable = true)]
        [XmlArrayItem(ElementName = "dataType", Namespace = "http://altinn.no/process")]
        public List<string> DataTypesToSign { get; set; } = new();
        
        /// <summary>
        /// Set what dataTypeId that should be used for storing the signature
        /// </summary>
        [XmlElement("signatureDataType", Namespace = "http://altinn.no/process")]
        public string SignatureDataType { get; set; }
    }
}