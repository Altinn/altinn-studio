using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Altinn.Platform.Authorization.Models
{
    /// <summary>
    /// Queries for a list of already delegated rules from the supplied offeredby for the supplied app. If coveredby
    /// has any key roles, those party ids can be included in the query to have the 3.0 PIP lookup those as well.
    /// If offeredby is a sub unit, parenty party id can be supplied to include rules given from that party as well.
    /// </summary>
    public class RuleQuery
    {
        /// <summary>
        /// Gets or sets the unique identifier for a the parent party id
        /// </summary>
        public int ParentPartyId { get; set; }

        /// <summary>
        /// Gets or sets the list of key role party ids
        /// </summary>
        [Required]
        public List<int> KeyRolePartyIds { get; set; }

        /// <summary>
        /// Gets or sets the unique identifier for a specific party for which the requested rule in the policy applies
        /// </summary>
        public int OfferedByPartyId { get; set; }

        /// <summary>
        /// Gets or sets resource match which uniquely identifies the resource this policy applies to.
        /// </summary>
        public List<List<AttributeMatch>> Resources { get; set; }

        /// <summary>
        /// Gets or sets the set of Attribute Id and Attribute Value for the coveredby id
        /// </summary>
        [Required]
        public List<AttributeMatch> CoveredBy { get; set; }
    }
}
