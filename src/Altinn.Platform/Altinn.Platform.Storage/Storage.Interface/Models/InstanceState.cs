using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Text;

namespace Storage.Interface.Models
{
    /// <summary>
    /// Holds the state of an instance
    /// </summary>
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
    }
}
