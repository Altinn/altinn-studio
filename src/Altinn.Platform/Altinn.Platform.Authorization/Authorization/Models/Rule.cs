using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Altinn.Platform.Authorization.Models
{
    /// <summary>
    /// This model describes a single rule in a delegated policy
    /// </summary>
    public class Rule
    {
        /// <summary>
        /// Gets or sets the unique identifier for a specific rule within a policy (Output only).
        /// </summary>
        public string RuleId { get; set; }

        /// <summary>
        /// Gets or sets the type of rule this is and why it is relevant for a given coveredby (recipient). Only part of output model when querying rules.
        /// Policies may apply(grant rights) in four different ways:
        /// 1. Direct delegations. This rule applies given directly to the recipient.
        /// 2. Inherited via key role. This rule grants a right given to a party where the recipient has a key role, thus inheriting all rights given to the party.
        /// 3. Inherited as subunit. If offeredby is a subunit, rights given from its parent to the recipient also applies to the subunit.
        /// 4. Inherited as subunit via keyrole.If offeredby is a subunit, rights given from its parent to a party in which the recipient has a key role also applies to the subunit.
        /// </summary>
        public RuleType Type { get; set; }

        /// <summary>
        /// Gets or sets the user id of the user who performed the delegation. When creating new rules, this is supplied to indicate who performed the delegation, allowing the 3.0 PAP to determine whether or not the user is allowed to do so and to log accordingly. Only part of input model when adding single rules.
        /// </summary>
        [Required]
        public int DelegatedByUserId { get; set; }

        /// <summary>
        /// Gets or sets the party offering the rights to the receiving (CoveredBy) entity.
        /// </summary>
        [Required]
        public int OfferedByPartyId { get; set; }

        /// <summary>
        /// Gets or sets the party receiving (covered by) the rights from the delegating (OfferedByPartyId) entity
        /// </summary>
        [Required]
        public List<AttributeMatch> CoveredBy { get; set; }

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
