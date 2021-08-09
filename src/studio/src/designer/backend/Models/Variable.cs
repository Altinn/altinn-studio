using Newtonsoft.Json;

namespace Altinn.Studio.Designer.Models
{
    /// <summary>
    /// Class representing the variables of a resource.
    /// </summary>
    public class Variable
    {
        /// <summary>
        /// Gets or sets the value of the key
        /// </summary>
        [JsonProperty("key")]
        public string Key { get; set; }

        /// <summary>
        /// Gets or sets the value of the data source
        /// </summary>
        [JsonProperty("dataSource")]
        public string DataSource { get; set; }
    } 
}
