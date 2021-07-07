using System.Collections.Generic;

namespace Altinn.Platform.Authorization.Models
{
    /// <summary>
    /// This model describes a xacml rule.
    /// </summary>
    public class Rule
    {
        /// <summary>
        /// Gets or sets the unique identifier for a specific rule within a policy. Not part of input model.
        /// </summary>
        public string RuleId { get; set; }

        /// <summary>
        /// Gets or sets the user id of the user who performed the delegation. When creating new rules, this is supplied to indicate who performed the delegation, allowing the 3.0 PAP to determine whether or not the user is allowed to do so and to log accordingly. Only part of input model when adding single rules.
        /// </summary>
        public int DelegatedByUserId { get; set; }

        /// <summary>
        /// Gets or sets the list of actions this rule applies for.
        /// </summary>
        public List<Action> Actions { get; set; }
    }
}
