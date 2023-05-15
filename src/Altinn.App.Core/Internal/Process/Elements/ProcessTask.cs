using System.Xml.Serialization;
using Altinn.App.Core.Internal.Process.Elements.Base;

namespace Altinn.App.Core.Internal.Process.Elements
{
    /// <summary>
    /// Class representing the task of a process
    /// </summary>
    public class ProcessTask: ProcessElement
    {
        /// <summary>
        /// Gets or sets the outgoing id of a task
        /// </summary>
        [XmlAttribute("tasktype", Namespace = "http://altinn.no")]
        public string? TaskType { get; set; }
        
        /// <summary>
        /// Defines the extension elements
        /// </summary>
        [XmlElement("extensionElements")]
        public ExtensionElements? ExtensionElements { get; set; }

        /// <summary>
        /// String representation of process element type
        /// </summary>
        /// <returns>Task</returns>
        public override string ElementType()
        {
            return "Task";
        }
    }
}
