using System.Collections.Generic;

using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Interface.Models
{
    /// <summary>
    /// A class to hold hide settings
    /// </summary>
    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public class HideSettings
    {
        /// <summary>
        /// Gets or sets the always hide property
        /// </summary>
        [JsonProperty(PropertyName = "hideAlways")]
        public bool HideAlways { get; set; }

        /// <summary>
        /// Gets or sets a list of tasks where hide applied.
        /// </summary>
        [JsonProperty(PropertyName = "hideOnTask")]
        public List<string> HideOnTask { get; set; }
    }
}
