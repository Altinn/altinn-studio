using System;
using System.Runtime.Serialization;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

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
        [JsonConverter(typeof(StringEnumConverter))]
        public ReadStatus ReadStatus { get; set; }

        /// <summary>
        /// Gets or sets the sub status of the instance.
        /// </summary>
        [JsonProperty(PropertyName = "subStatus")]
        public SubStatus SubStatus { get; set; }
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

    public class SubStatus
    {
        /// <summary>
        /// A text key pointing to a short description of the sub status.
        /// </summary>
        [JsonProperty(PropertyName = "label")]
        public string Label { get; set; }

        /// <summary>
        /// A text key pointing to a longer description of the sub status.
        /// </summary>
        [JsonProperty(PropertyName = "description")]
        public string Description { get; set; }
    }
}
