using System.Collections.Generic;
using Newtonsoft.Json;

namespace Altinn.Studio.Designer.Models
{
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
}
