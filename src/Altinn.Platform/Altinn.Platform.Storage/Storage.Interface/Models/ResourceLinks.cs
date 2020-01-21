using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Interface.Models
{
    /// <summary>
    /// Represent actual links to resources in various endpoints.
    /// </summary>
    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public class ResourceLinks
    {
        /// <summary>
        /// Gets or sets the application resource link. It is null if data is fetched from platform storage.
        /// </summary>
        [JsonProperty(PropertyName = "apps")]
        public string Apps { get; set; }

        /// <summary>
        /// Gets or sets platform resource link.
        /// </summary>
        [JsonProperty(PropertyName = "platform")]
        public string Platform { get; set; }
    }
}
