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

    /// <summary>
    /// Represents the actual texts identified by the key.
    /// </summary>
    public class TextResourceElement
    {
        /// <summary>
        /// Gets or sets the id
        /// </summary>
        [JsonProperty(PropertyName = "id")]
        public string Id { get; set; }

        /// <summary>
        /// Gets or sets the value
        /// </summary>
        [JsonProperty(PropertyName = "value")]
        public string Value { get; set; }

        /// <summary>
        /// Gets or sets the variables
        /// </summary>
        [JsonProperty(PropertyName = "variables")]
        public List<TextResourceVariable> Variables { get; set; }
    }

    /// <summary>
    /// Represents a replacement variable if any element in the text should be replaced.
    /// </summary>
    public class TextResourceVariable
    {
        /// <summary>
        /// Gets or sets the key
        /// </summary>
        [JsonProperty(PropertyName = "key")]
        public string Key { get; set; }

        /// <summary>
        /// Gets or sets the dataSource
        /// </summary>
        [JsonProperty(PropertyName = "dataSource")]
        public string DataSource { get; set; }
    }
}
