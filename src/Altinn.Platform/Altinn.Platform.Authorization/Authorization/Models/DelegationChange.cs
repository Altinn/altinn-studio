using System;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Altinn.Platform.Authorization.Models
{
    /// <summary>
    /// This model describes a delegation change as stored in the AUthorization postgre DelegatedPolicy table.
    /// </summary>
    public class DelegationChange
    {
        /// <summary>
        /// Gets or sets the policy change id
        /// </summary>
        [JsonPropertyName("policychangeid")]
        public int PolicyChangeId { get; set; }

        /// <summary>
        /// Gets or sets the altinnappid. E.g. skd/skattemelding
        /// </summary>
        [JsonPropertyName("altinnappis")]
        public string AltinnAppId { get; set; }

        /// <summary>
        /// Gets or sets the offeredbypartyid, refering to the party id of the user or organization offering the delegation.
        /// </summary>
        [JsonPropertyName("offeredbypartyid")]
        public int OfferedByPartyId { get; set; }

        /// <summary>
        /// Gets or sets the coveredbypartyid, refering to the party id of the organization having received the delegation. Otherwise Null if the recipient is a user.
        /// </summary>
        [JsonPropertyName("coveredbypartyid")]
        public int? CoveredByPartyId { get; set; }

        /// <summary>
        /// Gets or sets the coveredbyuserid, refering to the user id of the user having received the delegation. Otherwise Null if the recipient is an organization.
        /// </summary>
        [JsonPropertyName("coveredbyuserid")]
        public int? CoveredByUserId { get; set; }

        /// <summary>
        /// Gets or sets the user id of the user that performed the delegation.
        /// </summary>
        [JsonPropertyName("performinguserid")]
        public int DelegatedByUserId { get; set; }

        /// <summary>
        /// Gets or sets blobstoragepolicypath.
        /// </summary>
        [JsonPropertyName("performinguserid")]
        public string BlobStoragePolicyPath { get; set; }

        /// <summary>
        /// Gets or sets the blobstorage versionid
        /// </summary>
        [JsonPropertyName("blobstorageversionid")]
        public string BlobStorageVersionId { get; set; }

        /// <summary>
        /// Gets or sets the a value indicating whether the delegation change was a soft-deletion of the delegation policy blob
        /// </summary>
        [JsonPropertyName("isdeleted")]
        public bool IsDeleted { get; set; }

        /// <summary>
        /// Gets or sets the created date and timestamp for the delegation change
        /// </summary>
        [JsonPropertyName("created")]
        public DateTime Created { get; set; }
    }
}
