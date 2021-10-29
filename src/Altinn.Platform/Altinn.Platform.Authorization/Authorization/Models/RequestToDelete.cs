using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Altinn.Platform.Authorization.Models
{
    /// <summary>
    /// This model describes a list of rules to delete from a single policyfile
    /// </summary>
    public class RequestToDelete
    {
        /// <summary>
        /// Gets or sets a list of unique identifier for specific rules within a policy.
        /// </summary>
        public List<string> RuleIds { get; set; }

        /// <summary>
        /// Gets or sets the user id of the user who performed the deletion.
        /// </summary>
        [Required]
        public int DeletedByUserId { get; set; }

        /// <summary>
        /// Gets or sets the policy to delete from
        /// </summary>
        [Required]
        public PolicyMatch PolicyMatch { get; set; }
    }
}
