using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Interface.Models
{
    /// <summary>
    /// represent actual links to resources in various enpoints
    /// </summary>
    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public class ResourceLinks
    {
        /// <summary>
        /// Application resource link. It is null if data is fetched from platform storage.
        /// </summary>
        [JsonProperty(PropertyName = "apps")]
        public string Apps { get; set; }

        /// <summary>
        /// platform resource link.
        /// </summary>
        [JsonProperty(PropertyName = "platform")]
        public string Platform { get; set; }
    }
}
