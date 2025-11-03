using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models
{
    /// <summary>
    /// Defines resources that a given subject have access to
    /// </summary>
    public class SubjectResources
    {
        /// <summary>
        /// The subject
        /// </summary>
        public required AttributeMatchV2 Subject { get; set; }

        /// <summary>
        /// List of resources that the given subject has access to
        /// </summary>
        public required List<AttributeMatchV2> Resources { get; set; }
    }
}
