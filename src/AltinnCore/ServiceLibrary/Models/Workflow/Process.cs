using System.Collections.Generic;
using System.Xml.Serialization;

namespace AltinnCore.ServiceLibrary.Models.Workflow
{
    /// <summary>
    /// Class representing the process of a workflow
    /// </summary>
    public class Process
    {
        /// <summary>
        /// Gets or sets the ID of the process of a workflow
        /// </summary>
        [XmlAttribute("id")]
        public string Id { get; set; }

        /// <summary>
        /// Gets or sets if the process of a workflow is executable or not
        /// </summary>
        [XmlAttribute("isExecutable")]
        public bool IsExecutable { get; set; }

        /// <summary>
        /// Gets or sets the start event of the process of a workflow
        /// </summary>
        [XmlElement("startEvent")]
        public StartEvent StartEvent { get; set; }

        /// <summary>
        /// Gets or sets the list of tasks for the process of a workflow
        /// </summary>
        [XmlElement("task")]
        public List<Task> Task { get; set; }

        /// <summary>
        /// Gets or sets the end event of the process of a workflow
        /// </summary>
        [XmlElement("endEvent")]
        public EndEvent EndEvent { get; set; }

        /// <summary>
        /// Gets or sets the sequence flow of the process of a workflow
        /// </summary>
        [XmlElement("sequenceFlow")]
        public List<SequenceFlow> SequenceFlow { get; set; }
    }
}
