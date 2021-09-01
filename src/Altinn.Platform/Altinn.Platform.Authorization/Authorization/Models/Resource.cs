using System.Collections.Generic;

namespace Altinn.Platform.Authorization.Models
{
    /// <summary>
    /// This model describes a resource that may be used in a rule describing a right.
    /// </summary>
    public class Resource
    {
        /// <summary>
        /// Gets or sets the name of the resource. "Default" if it is the app itself (ie resource without task in the XACML-poliicy), else the name (identifier) of the task.
        /// </summary>
        public string Name { get; set; }

        /// <summary>
        /// Gets or sets the title
        /// </summary>
        public LocalizedText Title { get; set; }

        /// <summary>
        /// Gets or sets which actions are granted access to for this resource
        /// </summary>
        public List<Action> Actions { get; set; }
    }
}
