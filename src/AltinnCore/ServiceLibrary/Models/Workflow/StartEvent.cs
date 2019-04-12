using System.Xml.Serialization;

namespace AltinnCore.ServiceLibrary.Models.Workflow
{
    /// <summary>
    /// Class representing the start event of a process
    /// </summary>
    public class StartEvent
    {
        /// <summary>
        /// Gets or sets the ID of the start event of a process
        /// </summary>
        [XmlAttribute("id")]
        public string Id { get; set; }

        /// <summary>
        /// Gets or sets the outgoing id of the start event of a process
        /// </summary>
        [XmlElement("outgoing")]
        public string Outgoing { get; set; }
    }
}
