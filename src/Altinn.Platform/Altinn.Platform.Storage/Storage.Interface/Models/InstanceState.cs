using Newtonsoft.Json;
using System;


namespace Storage.Interface.Models
{
    /// <summary>
    /// Holds the state of an instance
    /// </summary>
    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public class InstanceState
    {
        /// <summary>
        /// Gets or sets whether a user has deleted the instance
        /// </summary>
        [JsonProperty(PropertyName = "isDeleted")]
        public bool IsDeleted { get; set; }

        /// <summary>
        /// Gets or sets whether a user has marked the instance for hard delete
        /// </summary>
        [JsonProperty(PropertyName = "isMarkedForHardDelete")]
        public bool IsMarkedForHardDelete { get; set; }

        /// <summary>
        /// Gets or sets whether a user archived the instance
        /// </summary>
        [JsonProperty(PropertyName = "isArchived")]
        public bool IsArchived { get; set; }

        /// <summary>
        /// Gets or set the date the instance was archived 
        /// </summary>
        [JsonProperty(PropertyName = "archivedDateTime")]
        public DateTime? ArchivedDateTime { get; set; }

        /// <summary>
        /// Gets or sets the date the instance was deleted
        /// </summary>
        [JsonProperty(PropertyName = "deletedDateTime")]
        public DateTime? DeletedDateTime { get; set; }
    }
}
