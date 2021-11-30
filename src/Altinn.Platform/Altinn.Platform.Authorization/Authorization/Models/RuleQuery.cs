using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Altinn.Platform.Authorization.Models
{
    /// <summary>
    /// Queries for a list of already delegated rules from the supplied offeredby for the supplied app. If coveredby has any key roles, those party ids can be included in the query to have the 3.0 PIP lookup those as well. If offeredby is a sub unit, parenty party id can be supplied to include rules given from that party as well.
    /// </summary>
    public class RuleQuery
    {
        /// <summary>
        /// Gets or sets the unique identifier for a the parent party id
        /// </summary>
        public int ParentPartyId { get; set; }

        /// <summary>
        /// Gets or sets the list of PolicyMatches
        /// </summary>
        [Required]
        public List<PolicyMatch> PolicyMatches { get; set; }

        /// <summary>
        /// Gets or sets the list of key role party ids
        /// </summary>
        [Required]
        public List<int> KeyRolePartyIds { get; set; }
    }
}
