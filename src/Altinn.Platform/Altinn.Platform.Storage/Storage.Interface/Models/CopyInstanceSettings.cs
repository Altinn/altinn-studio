using System.Collections.Generic;

using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Interface.Models
{
    /// <summary>
    /// A class holding copy instance settings.
    /// </summary>
    public class CopyInstanceSettings
    {
        /// <summary>
        /// Gets or sets a boolean indicating if copy instance is enabled.
        /// </summary>
        [JsonProperty(PropertyName = "enabled")]
        public bool Enabled { get; set; }

        /// <summary>
        /// Gets or sets a list of excluded data types.
        /// </summary>
        [JsonProperty(PropertyName = "excludedDataTypes")]
        public List<string> ExcludedDataTypes { get; set; }

        /// <summary>
        /// Gets or sets a dictionary indexed by data type that contains a list of excluded datafields.
        /// </summary>
        [JsonProperty(PropertyName = "excludedDataFields")]
        public Dictionary<string, List<string>> ExcludedDataFields { get; set; }
    }
}
