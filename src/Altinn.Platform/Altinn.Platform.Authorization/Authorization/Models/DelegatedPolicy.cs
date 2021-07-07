using System.Collections.Generic;

namespace Altinn.Platform.Authorization.Models
{
    /// <summary>
    /// This model describes a delegated policy describing rights granting access to one or more actions for a single app.
    /// </summary>
    public class DelegatedPolicy
    {
        /// <summary>
        /// Gets or sets the party giving the rights.
        /// </summary>
        public int OfferedByPartyId { get; set; }

        /// <summary>
        /// Gets or sets the party being granted the rights. Not set if person user, set if organization or enterprise user.
        /// </summary>
        public int CoveredByPartyId { get; set; }

        /// <summary>
        /// Gets or sets the user being granted the rights. Not set if organization, set if person user or enterprise user.
        /// </summary>
        public int CoveredByUserId { get; set; }

        /// <summary>
        /// Gets or sets the type of policy this is and why it is relevant for a given coveredby (recipient).
        /// </summary>
        public string Type { get; set; }

        /// <summary>
        /// Gets or sets the list of rules describing which rules exists in the delegated policy
        /// </summary>
        public List<Rule> Rules { get; set; }

        /// <summary>
        /// Gets or sets the user creating a particular policy. Only used in input model. 
        /// </summary>
        public int DelegatedByUserId { get; set; }
    }
}
