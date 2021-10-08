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
        /// Gets or sets the list of resource matches which uniquely identifies the resource this rule applies to.
        /// </summary>
        [Required]
        public List<List<AttributeMatch>> Resources { get; set; }

        /// <summary>
        /// Gets or sets the set of Attribute Id and Attribute Value for a specific action, to identify the action from the original App Policy
        /// </summary>
        [Required]
        public AttributeMatch CoveredBy { get; set; }

        /// <summary>
        /// Gets or sets the set of offered by party id
        /// </summary>
        [Required]
        public int OfferedByPartyId { get; set; }
    }
}
