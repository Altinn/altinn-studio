using System.Collections.Generic;
using Newtonsoft.Json;

namespace Altinn.Studio.Designer.Models
{
    /// <summary>
    /// Represents a set of texts on a specified language.
    /// </summary>
    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public class TextResource
    {
        /// <summary>
        /// Gets or sets the language. Should be a two letter ISO name.
        /// </summary>
        [JsonProperty(PropertyName= "language")]
        public string Language { get; set; }

        /// <summary>
        /// Gets or sets a list of text resource elements
        /// </summary>
        [JsonProperty(PropertyName = "resources")]
        public List<TextResourceElement> Resources { get; set; }
    }
}
