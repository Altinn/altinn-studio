using System;

namespace Altinn.App.Common.Process.Elements
{
    /// <summary>
    /// Represents information about an element in a BPMN description.
    /// </summary>
    public class ElementInfo
    {
        /// <summary>
        /// The unique id of a specific element in the BPMN
        /// </summary>
        public string Id { get; set; }

        /// <summary>
        /// The type of BPMN element
        /// </summary>
        public string ElementType { get; set; }

        /// <summary>
        /// The name of the BPMN element
        /// </summary>
        public string Name { get; set; }

        /// <summary>
        /// The altinn specific task type
        /// </summary>
        public string AltinnTaskType { get; set; }
    }
}
