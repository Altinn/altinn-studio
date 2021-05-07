using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Interface.Models
{
    /// <summary>
    /// The on entry configuration
    /// </summary>
    public class OnEntryConfig
    {
        /// <summary>
        /// Defines what should be shown on entry.
        /// </summary>
        /// <remarks>
        /// Valid selections include: a string matching the layoutSetId
        /// </remarks>
        [JsonProperty(PropertyName = "show")]
        public string Show { get; set; }
    }
}
