using System.Collections.Generic;
using Altinn.Platform.Storage.Models;
using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Repository
{
    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public class QueryResponse
    {
        [JsonProperty(PropertyName = "totalHits")]
        public int? TotalHits { get; set; }

        [JsonProperty(PropertyName = "count")]
        public int? Count { get; set; }

        [JsonProperty(PropertyName = "continuationToken")]
        public string ContinuationToken { get; set; }

        [JsonProperty(PropertyName = "exception")]
        public string Exception { get; set; }

        [JsonProperty(PropertyName = "instances")]
        public List<Instance> Instances { get; set; }
    }
}
