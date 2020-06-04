using System;

using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Interface.Models
{
    /// <summary>
    /// Represents set of statuses used by the message box to determine
    /// where to show the instance and which icons to use.
    /// </summary>
    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public class InstanceStatus
    {
        /// <summary>
        /// Gets or sets the date the instance was archived.
        /// </summary>
        [JsonProperty(PropertyName = "archived")]
        public DateTime? Archived { get; set; }

        /// <summary>
        /// Gets or sets the date the instance was deleted.
        /// </summary>
        [JsonProperty(PropertyName = "softDeleted")]
        public DateTime? SoftDeleted { get; set; }

        /// <summary>
        /// Gets or sets the date the instance was marked for hard delete by user.
        /// </summary>
        [JsonProperty(PropertyName = "hardDeleted")]
        public DateTime? HardDeleted { get; set; }

        /// <summary>
        /// Gets or sets the read status of the instance.
        /// </summary>
        [JsonProperty(PropertyName = "readStatus")]

        public ReadStatus ReadStatus{get; set;}
    }

    public enum ReadStatus
    {
        /// <summary>
        /// Instance is unread
        /// </summary>
        Unread,

        /// <summary>
        /// Instance is read
        /// </summary>
        Read,

        /// <summary>
        /// Instance has been updated since last review
        /// </summary>
        UpdatedSinceLastReview
    }
}
