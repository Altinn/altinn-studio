using Newtonsoft.Json;
using System;


namespace Altinn.Platform.Storage.Models
{
    /// <summary>
    /// Holds the state of an instance with respect to the Altinn inbox.
    /// </summary>
    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public class InboxState
    {
        /// <summary>
        /// The visible attribute controls when the instance should be visible in the inbox.
        /// </summary>
        [JsonProperty(PropertyName = "visibleAfter")]
        public DateTime? VisibleAfter { get; set; }

        /// <summary>
        /// The date the instance was archived.
        /// </summary>
        [JsonProperty(PropertyName = "archived")]
        public DateTime? Archived { get; set; }

        /// <summary>
        /// The date the instance was deleted. 
        /// </summary>
        [JsonProperty(PropertyName = "deleted")]
        public DateTime? Deleted { get; set; }

        /// <summary>
        /// The title of the instance that be shown in the inbox.
        /// </summary>
        [JsonProperty(PropertyName = "title")]
        public LanguageString Title { get; set; }
    }
}
