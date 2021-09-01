using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Altinn.Platform.Authorization.Models
{
    /// <summary>
    /// This model describes an action that may be used in a rule describing a right.
    /// </summary>
    public class Action
    {
        /// <summary>
        /// Gets or sets the name of the action, eg. read, write, sign.
        /// </summary>
        [Required]
        public string Name { get; set; }

        /// <summary>
        /// Gets or sets the title
        /// </summary>
        public LocalizedText Title { get; set; }

        /// <summary>
        /// Gets or sets the description
        /// </summary>
        public LocalizedText Description { get; set; }

        /// <summary>
        /// Gets or sets which roles are granted access to this action on this resource
        /// </summary>
        public List<RoleGrant> RoleGrants { get; set; }
    }
}
