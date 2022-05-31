using System;

using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Interface.Models
{
    /// <summary>
    /// Represents metadata about the delete status of an element
    /// </summary>
    public class DeleteStatus
    {
        /// <summary>
        /// Gets or sets if the element is hard deleted.
        /// </summary>
        [JsonProperty(PropertyName = "isHardDeleted")]
        public bool IsHardDeleted { get; set; }

        /// <summary>
        /// Gets or sets the date the element was marked for hard delete.
        /// </summary>
        [JsonProperty(PropertyName = "hardDeleted")]
        public DateTime? HardDeleted { get; set; }
    }
}
