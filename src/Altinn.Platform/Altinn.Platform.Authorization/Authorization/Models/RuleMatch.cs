using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Altinn.Platform.Authorization.Models
{
    /// <summary>
    /// This model describes a single rule in a delegated policy
    /// </summary>
    public class RuleMatch
    {
        /// <summary>
        /// Gets or sets the unique identifier for a specific rule within a policy. Not part of input model.
        /// </summary>
        public string RuleId { get; set; }

        /// <summary>
        /// Gets or sets the user id of the user who performed the delegation. When creating new rules, this is supplied to indicate who performed the delegation, allowing the 3.0 PAP to determine whether or not the user is allowed to do so and to log accordingly. Only part of input model when adding single rules.
        /// </summary>
        [Required]
        public int DelegatedByUserId { get; set; }

        /// <summary>
        /// Gets or sets the list of resource matches which uniquely identifies the resource this rule applies to.
        /// </summary>
        [Required]
        public List<AttributeMatch> Resource { get; set; }

        /// <summary>
        /// Gets or sets the set of Attribute Id and Attribute Value for a specific action, to identify the action from the original App Policy
        /// </summary>
        [Required]
        public AttributeMatch Action { get; set; }
    }
}
