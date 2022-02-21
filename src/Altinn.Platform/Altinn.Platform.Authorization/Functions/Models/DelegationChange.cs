using System;
using System.Text.Json.Serialization;

namespace Altinn.Platform.Authorization.Functions.Models
{
    /// <summary>
    /// This model describes a delegation change as stored in the PostgreSQL-database Authorization in the table DelegatedPolicy.
    /// </summary>
    public class DelegationChange
    {
        /// <summary>
        /// Gets or sets the policy change id
        /// </summary>
        [JsonPropertyName("p")]
        public int PolicyChangeId { get; set; }

        /// <summary>
        /// Gets or sets the altinnappid. E.g. skd/skattemelding
        /// </summary>
        [JsonPropertyName("a")]
        public string AltinnAppId { get; set; }

        /// <summary>
        /// Gets or sets the offeredbypartyid, refering to the party id of the user or organization offering the delegation.
        /// </summary>
        [JsonPropertyName("o")]
        public int OfferedByPartyId { get; set; }

        /// <summary>
        /// Gets or sets the coveredbypartyid, refering to the party id of the organization having received the delegation. Otherwise Null if the recipient is a user.
        /// </summary>
        [JsonPropertyName("cp")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public int? CoveredByPartyId { get; set; }

        /// <summary>
        /// Gets or sets the coveredbyuserid, refering to the user id of the user having received the delegation. Otherwise Null if the recipient is an organization.
        /// </summary>
        [JsonPropertyName("cu")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public int? CoveredByUserId { get; set; }

        /// <summary>
        /// Gets or sets the user id of the user that performed the delegation change (either added or removed rules to the policy, or deleted it entirely).
        /// </summary>
        [JsonPropertyName("p")]
        public int PerformedByUserId { get; set; }

        /// <summary>
        /// Gets or sets the created date and timestamp for the delegation change
        /// </summary>
        [JsonPropertyName("t")]
        public DateTime Created { get; set; }
    }
}
