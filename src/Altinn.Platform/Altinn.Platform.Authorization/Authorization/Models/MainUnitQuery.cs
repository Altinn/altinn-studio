using System.Collections.Generic;

namespace Altinn.Platform.Authorization.Models
{
    /// <summary>
    /// Input Model used by SBL Bridge partyparents endpoint, for listing the subunit partyIds to retrieve mainunit information for.
    /// </summary>
    public class MainUnitQuery
    {
        /// <summary>
        /// Gets or sets the PartyId of the main unit
        /// </summary>
        public List<int> PartyIds { get; set; }
    }
}
