using System.Xml.Serialization;

namespace AltinnCore.ServiceLibrary.Models.Workflow
{
    /// <summary>
    /// Class representing the definitions
    /// </summary>
    [XmlTypeAttribute(Namespace = "http://www.omg.org/spec/BPMN/20100524/MODEL")]
    [XmlRootAttribute("definitions", Namespace = "http://www.omg.org/spec/BPMN/20100524/MODEL")]
    public class Definitions
    {
        /// <summary>
        /// Gets or sets the ID of the definition
        /// </summary>
        [XmlAttribute("id")]
        public string Id { get; set; }

        /// <summary>
        /// Gets or sets the target namespace of the definition
        /// </summary>
        [XmlAttribute("targetNamespace")]
        public string TargetNamespace { get; set; }

        /// <summary>
        /// Gets or sets the process of the workflow
        /// </summary>
        [XmlElement("process")]
        public Process Process { get; set; }
    }
}
