using System.Collections.Generic;
using System.Xml.Serialization;

namespace Altinn.App.Common.Process.Elements
{
    /// <summary>
    /// Represents an exclusive gateway from a BPMN process definition.
    /// </summary>
    public class ExclusiveGateway
    {
        /// <summary>
        /// Gets or sets the id of the exclusive gateway.
        /// </summary>
        [XmlAttribute("id")]
        public string Id { get; set; }

        /// <summary>
        /// Gets or sets the name of the exclusive gateway.
        /// </summary>
        [XmlAttribute("name")]
        public string Name { get; set; }

        /// <summary>
        /// Gets or sets the name of the exclusive gateway.
        /// </summary>
        [XmlAttribute("default")]
        public string Default { get; set; }

        /// <summary>
        /// Gets or sets the list of sequence flows that leads to this exclusive gateway.
        /// </summary>
        [XmlElement("incoming")]
        public List<string> Incoming { get; set; }

        /// <summary>
        /// Gets or sets the list of sequence flows that leads out of this exclusive gateway.
        /// </summary>
        [XmlElement("outgoing")]
        public List<string> Outgoing { get; set; }
    }
}
