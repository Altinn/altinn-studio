using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Interface.Models
{
    /// <summary>
    /// Class that holds the message box configuration for an application.
    /// </summary>
    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public class MessageBoxConfig
    {
        /// <summary>
        /// Gets or setts the hide settings.
        /// </summary>
        [JsonProperty(PropertyName = "hideSettings")]
        public HideSettings HideSettings { get; set; }
    }
}
