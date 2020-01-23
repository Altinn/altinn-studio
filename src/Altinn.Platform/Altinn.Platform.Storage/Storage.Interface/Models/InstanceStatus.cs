using System;

using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Interface.Models
{
    /// <summary>
    /// Represents set of possible statuses that dictate where the message box will display the instance.
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
    }
}
