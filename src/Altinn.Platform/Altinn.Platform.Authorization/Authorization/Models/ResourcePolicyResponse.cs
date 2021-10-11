using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Altinn.Platform.Authorization.Models
{
    /// <summary>
    /// This model describes the actions that can be performed for a particular resource within a app policy
    /// </summary>
    public class ResourcePolicyResponse
    {
        /// <summary>
        /// Gets or sets the ctions associcated with this particular resource including which roles have been granted access to it
        /// </summary>
        [Required]
        public List<AttributeMatch> OrgApp { get; set; }

        /// <summary>
        /// Gets or sets the list of resource matches which together uniquely identifies the resource in the app policy, e.g. org, app and/or tasks, events etc.
        /// </summary>
        [Required]
        public List<ResourcePolicy> ResourcePolicies { get; set; }

        /// <summary>
        /// The error
        /// </summary>
        public string ErrorResponse { get; set; }
    }
}
