using System.Collections.Generic;

using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Interface.Models
{
    /// <summary>
    /// Represents an set of settings where application owner can define custom sets of
    /// static data to present to end user in given task(s).
    /// </summary>
    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public class PresentationField
    {
        /// <summary>
        /// Gets or sets the Id of the presentation field.
        /// </summary>
        [JsonProperty(PropertyName = "id")]
        public string Id { get; set; }

        /// <summary>
        /// Gets or sets the text resource key associated with the presentation field.
        /// </summary>
        [JsonProperty(PropertyName = "textResource")]
        public string TextResource { get; set; }

        /// <summary>
        /// Gets or sets the static value to be shown in the presentation field.
        /// </summary>
        [JsonProperty(PropertyName = "value")]
        public string Value { get; set; }

        /// <summary>
        /// Gets or sets the list of tasks that the presentation field applies to.
        /// </summary>
        [JsonProperty(PropertyName = "taskIds")]
        public List<string> TaskIds { get; set; }
    }
}
