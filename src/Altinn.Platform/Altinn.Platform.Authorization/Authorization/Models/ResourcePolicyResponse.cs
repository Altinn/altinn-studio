using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Altinn.Platform.Authorization.Models
{
    /// <summary>
    /// This model wraps the response for looking up resource policies for a specific Altinn app.
    /// </summary>
    public class ResourcePolicyResponse
    {
        /// <summary>
        /// Gets or sets the attribute match specification for identifying the app
        /// </summary>
        [Required]
        public List<AttributeMatch> AppId { get; set; }

        /// <summary>
        /// Gets or sets the list of resource policies, detailing what action are available for the different the resources, as specifiec in the app policy.
        /// </summary>
        [Required]
        public List<ResourcePolicy> ResourcePolicies { get; set; }

        /// <summary>
        /// The minimum authentication level requirement of the app
        /// </summary>
        public int MinimumAuthenticationLevel { get; set; }

        /// <summary>
        /// The error response if request fails
        /// </summary>
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
        public string ErrorResponse { get; set; }
    }
}
