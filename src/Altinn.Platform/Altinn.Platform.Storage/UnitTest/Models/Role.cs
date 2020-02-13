using System;
using Newtonsoft.Json;

namespace Altinn.Platform.Storage.UnitTest.Models
{
    /// <summary>
    /// Entity representing a Role
    /// </summary>
    [Serializable]
    public class Role
    {
        /// <summary>
        /// Gets or sets the role type
        /// </summary>
        [JsonProperty]
        public string Type { get; set; }

        /// <summary>
        /// Gets or sets the role
        /// </summary>
        [JsonProperty]
        public string Value { get; set; }
    }
}
