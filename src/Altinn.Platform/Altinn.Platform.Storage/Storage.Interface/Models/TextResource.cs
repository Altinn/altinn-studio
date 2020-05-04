using System.Collections.Generic;
using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Interface.Models
{
    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public class TextResource
    {
        /// <summary>
        /// Gets or sets the unique id of the text resource, format {org}-{app}-{language} e.g. ttd-demoapp-nb
        /// </summary>
        [JsonProperty(PropertyName = "id")]
        public string Id { get; set; }

        /// <summary>
        /// Gets or sets the org, used as a partition key
        /// </summary>
        [JsonProperty(PropertyName = "org")]
        public string Org {get; set;}

        /// <summary>
        /// Gets or sets the language. Should be a two letter ISO name.
        /// </summary>
        /// <value></value>
        [JsonProperty(PropertyName= "language")]
        public string Language {get; set;}

        /// <summary>
        /// Gets or sets a list of text resource elements
        /// </summary>
        [JsonProperty(PropertyName = "resources")]
        public List<TextResourceElement> Resources { get; set; }

    }

    public class TextResourceElement
    {
        /// <summary>
        /// Gets or sets the id
        /// </summary>
        [JsonProperty(PropertyName = "id")]
        public string Id { get; set; }

        /// <summary>
        /// gets or sets the value
        /// </summary>
        [JsonProperty(PropertyName = "value")]
        public string Value { get; set; }

        /// <summary>
        /// gets or sets the variables
        /// </summary>
        [JsonProperty(PropertyName = "variables")]
        public List<TextResourceVariable> Variables { get; set; }
    }

    public class TextResourceVariable
    {
        /// <summary>
        /// gets or sets the key
        /// </summary>
        [JsonProperty(PropertyName = "key")]
        public string Key { get; set; }

        /// <summary>
        /// gets or sets the dataSource
        /// </summary>
        [JsonProperty(PropertyName = "dataSource")]
        public string DataSource { get; set; }
    }
}
