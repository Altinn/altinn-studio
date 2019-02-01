using System.Xml.Serialization;

namespace AltinnCore.ServiceLibrary.Workflow
{
    /// <summary>
    /// Class representing the end event of a process
    /// </summary>
    public class EndEvent
    {
        /// <summary>
        /// Gets or sets the ID of a end event
        /// </summary>
        [XmlAttribute("id")]
        public string Id { get; set; }

        /// <summary>
        /// Gets or sets the incoming id of a end event
        /// </summary>
        [XmlElement("incoming")]
        public string Incoming { get; set; }
    }
}
