using Newtonsoft.Json;

namespace Altinn.Studio.Designer.Models
{
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
