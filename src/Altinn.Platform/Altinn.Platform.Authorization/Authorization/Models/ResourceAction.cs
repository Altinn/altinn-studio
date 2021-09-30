using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Altinn.Platform.Authorization.Models
{
    /// <summary>
    /// This model describes an action that may be used in a rule describing a right.
    /// </summary>
    public class ResourceAction
    {
        /// <summary>
        /// Gets or sets the set of Attribute Id and Attribute Value for the specific action, from the original app policy
        /// </summary>
        [Required]
        public AttributeMatch Match { get; set; }

        /// <summary>
        /// Gets or sets a title for the action
        /// </summary>
        public string Title { get; set; }

        /// <summary>
        /// Gets or sets a description of the action.
        /// </summary>
        public string Description { get; set; }

        /// <summary>
        /// Gets or sets which roles are granted access to this action on this resource
        /// </summary>
        public List<RoleGrant> RoleGrants { get; set; }
    }
}
