using Newtonsoft.Json;
using System;


namespace Altinn.Platform.Storage.Interface.Models
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
        [JsonProperty(PropertyName = "softDeleted")]
        public DateTime? SoftDeleted { get; set; }

        /// <summary>
        /// The data the instance was marked for hard delete by user.
        /// </summary>
        [JsonProperty(PropertyName = "hardDeleted")]
        public DateTime? HardDeleted { get; set; }

        /// <summary>
        /// The title of the instance that be shown in the inbox.
        /// </summary>
        [JsonProperty(PropertyName = "title")]
        public LanguageString Title { get; set; }
    }
}
