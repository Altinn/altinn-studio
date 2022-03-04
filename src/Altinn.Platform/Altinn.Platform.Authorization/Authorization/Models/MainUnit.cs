using Newtonsoft.Json;

namespace Altinn.Platform.Authorization.Models
{
    /// <summary>
    /// Model returned by SBL Bridge partyparents endpoint, describing a main unit (hovedenhet).
    /// </summary>
    public class MainUnit
    {
        /// <summary>
        /// Gets or sets the PartyId of the main unit
        /// </summary>
        [JsonProperty("ParentPartyId")]
        public int? PartyId { get; set; }

        /// <summary>
        /// Gets or sets the PartyId of the subunit
        /// </summary>
        [JsonProperty("PartyId")]
        public int SubunitPartyId { get; set; }

        /// <summary>
        /// Gets or sets the organization number of the main unit
        /// </summary>
        [JsonProperty("ParentOrganizationNumber")]
        public string OrganizationNumber { get; set; }

        /// <summary>
        /// Gets or sets the name of the main unit
        /// </summary>
        [JsonProperty("ParentOrganizationName")]
        public string OrganizationName { get; set; }
    }
}
