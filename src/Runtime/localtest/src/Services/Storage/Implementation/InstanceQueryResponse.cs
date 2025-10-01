using System.Collections.Generic;
using Altinn.Platform.Storage.Interface.Models;
using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Repository
{
    /// <summary>
    /// Represents an instance query response.
    /// </summary>
    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public class InstanceQueryResponse
    {
        /// <summary>
        /// The number of instances returned in this response.
        /// </summary>
        [JsonProperty(PropertyName = "count")]
        public int? Count { get; set; }

        /// <summary>
        /// The url to the next page. Null if no next page exists.
        /// </summary>
        [JsonProperty(PropertyName = "next")]
        public string Next { get; set; }

        /// <summary>
        /// The url to the query that created this page.
        /// </summary>
        [JsonProperty(PropertyName = "self")]
        public string Self { get; set; }

        /// <summary>
        /// The url to the previous page. Null if no previous page exists.
        /// </summary>
        [JsonProperty(PropertyName = "continuationToken")]
        public string ContinuationToken { get; set; }

        /// <summary>
        /// More detailed exception message if anything went wrong with the query.
        /// </summary>
        [JsonProperty(PropertyName = "exception")]
        public string Exception { get; set; }

        /// <summary>
        /// The actual instances that matched the query.
        /// </summary>
        [JsonProperty(PropertyName = "instances")]
        public List<Instance> Instances { get; set; }
    }
}
