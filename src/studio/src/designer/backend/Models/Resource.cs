using System.Collections.Generic;
using Newtonsoft.Json;

namespace Altinn.Studio.Designer.Models
{
    /// <summary>
    /// Class representing a resource
    /// </summary>
    public class Resource
    {
        /// <summary>
        /// Gets or sets the ID of the resource
        /// </summary>
        [JsonProperty("id")]
        public string Id { get; set; }

        /// <summary>
        /// Gets or sets the value of the resource
        /// </summary>
        [JsonProperty("value")]
        public string Value { get; set; }

        /// <summary>
        /// Gets or sets the variables used in the resource
        /// </summary>
        [JsonProperty("variables")]
        public List<Variable> Variables { get; set; }

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

        /// <summary>
        /// String representation, for debug
        /// </summary>
        /// <returns> <see cref="string"/> containing id and value. </returns>
        public override string ToString()
        {
            return $"Resource[{Id}=\"{Value}\"]";
        }
    }
}
