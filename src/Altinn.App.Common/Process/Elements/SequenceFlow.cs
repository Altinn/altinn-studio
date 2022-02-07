using System.Xml.Serialization;

namespace Altinn.App.Common.Process.Elements
{
    /// <summary>
    /// Class representing the sequence flow of a process
    /// </summary>
    public class SequenceFlow
    {
        /// <summary>
        /// Gets or sets the ID of a sequence flow
        /// </summary>
        [XmlAttribute("id")]
        public string Id { get; set; }

        /// <summary>
        /// Gets or sets the source reference of a sequence flow
        /// </summary>
        [XmlAttribute("sourceRef")]
        public string SourceRef { get; set; }

        /// <summary>
        /// Gets or sets the target reference of a sequence flow
        /// </summary>
        [XmlAttribute("targetRef")]
        public string TargetRef { get; set; }

        /// <summary>
        /// Gets or sets the flowtype of a sequence flow. 
        /// </summary>
        [XmlAttribute("flowtype", Namespace = "http://altinn.no")]
        public string FlowType { get; set; }
    }
}
