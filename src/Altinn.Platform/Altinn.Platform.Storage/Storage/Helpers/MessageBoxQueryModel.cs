using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Altinn.Platform.Storage.Helpers
{
    /// <summary>
    /// Represents queryparams for search from messagebox.
    /// </summary>
    public class MessageBoxQueryModel
    {
        /// <summary>
        /// List of instance owner party id(s)
        /// </summary>
        [JsonPropertyName("instanceOwnerPartyIdList")]
        public List<int> InstanceOwnerPartyIdList { get; set; }

        /// <summary>
        /// The application id
        /// </summary>
        [JsonPropertyName("appId")]
        public string AppId { get; set; }

        /// <summary>
        /// Boolean indicating whether to include active instances.
        /// </summary>
        [JsonPropertyName("includeActive")]
        public bool IncludeActive { get; set; }

        /// <summary>
        /// Boolean indicating whether to include archived instances.
        /// </summary>
        [JsonPropertyName("includeArchived")]
        public bool IncludeArchived { get; set; }

        /// <summary>
        /// Boolean indicating whether to include deleted instances.
        /// </summary>
        [JsonPropertyName("includeDeleted")]
        public bool IncludeDeleted { get; set; }

        /// <summary>
        /// Last changed date.
        /// </summary>
        [JsonPropertyName("lastChanged")]
        public string LastChanged { get; set; }

        /// <summary>
        /// Created time.
        /// </summary>
        [JsonPropertyName("created")]
        public string Created { get; set; }

        /// <summary>
        /// Search string.
        /// </summary>
        [JsonPropertyName("searchString")]
        public string SearchString { get; set; }

        /// <summary>
        /// The archive reference.
        /// </summary>
        [JsonPropertyName("archiveReference")]
        public string ArchiveReference { get; set; }

        /// <summary>
        /// Language nb, en, nn
        /// </summary>
        [JsonPropertyName("language")]
        public string Language { get; set; }
    }
}
