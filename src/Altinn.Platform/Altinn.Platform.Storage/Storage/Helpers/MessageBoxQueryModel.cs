using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
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
        [Required]
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
        /// Gets or sets the from last changed date.
        /// </summary>
        [JsonPropertyName("fromLastChanged")]
        public DateTime? FromLastChanged { get; set; }

        /// <summary>
        /// Gets or sets the to last changed date.
        /// </summary>
        [JsonPropertyName("toLastChanged")]
        public DateTime? ToLastChanged { get; set; }

        /// <summary>
        /// Gets or sets the from created time.
        /// </summary>
        [JsonPropertyName("fromCreated")]
        public DateTime? FromCreated { get; set; }

        /// <summary>
        /// Gets or sets the to created time.
        /// </summary>
        [JsonPropertyName("toCreated")]
        public DateTime? ToCreated { get; set; }

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
