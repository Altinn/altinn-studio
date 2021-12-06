using System.Collections.Generic;
using System.Xml.Serialization;

namespace Altinn.App.Common.Process.Elements
{
    /// <summary>
    /// Class representing the task of a process
    /// </summary>
    public class ExclusiveGateway
    {
        /// <summary>
        /// Gets or sets the ID of a task
        /// </summary>
        [XmlAttribute("id")]
        public string Id { get; set; }

        /// <summary>
        /// Gets or sets the name of a task
        /// </summary>
        [XmlAttribute("name")]
        public string Name { get; set; }

        /// <summary>
        /// Gets or sets the name of a task
        /// </summary>
        [XmlAttribute("default")]
        public string Default { get; set; }

        /// <summary>
        /// Gets or sets the incoming id of a task
        /// </summary>
        [XmlElement("incoming")]
        public List<string> Incoming { get; set; }

        /// <summary>
        /// Gets or sets the outgoing id of a task
        /// </summary>
        [XmlElement("outgoing")]
        public List<string> Outgoing { get; set; }
    }
}
