using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Altinn.Platform.Authorization.Models
{
    /// <summary>
    /// This model describes the actions that can be performed for a particular resource
    /// </summary>
    public class ResourcePolicy
    {
        /// <summary>
        /// Gets or sets a description of the resource policy.
        /// </summary>
        public string Description { get; set; }

        /// <summary>
        /// Gets or sets a title for the resource policy to be used for displaying the resource in AltinnII.
        /// </summary>
        public string Title { get; set; }

        /// <summary>
        /// Gets or sets the actions associcated with this particular resource including which roles have been granted access to it
        /// </summary>
        public List<ResourceAction> Actions { get; set; }

        /// <summary>
        /// Gets or sets the list of resource matches which together uniquely identifies the resource in the app policy, e.g. org, app and/or tasks, events etc.
        /// </summary>
        [Required]
        public List<AttributeMatch> Resource { get; set; }
    }
}
