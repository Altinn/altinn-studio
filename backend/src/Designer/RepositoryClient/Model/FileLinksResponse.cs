using System.Runtime.Serialization;
using Newtonsoft.Json;

namespace Altinn.Studio.Designer.RepositoryClient.Model
{
    [DataContract]
    public class FileLinksResponse
    {
        [JsonProperty("git")]
        public string git { get; set; }

        [JsonProperty("html")]
        public string html { get; set; }

        [JsonProperty("self")]
        public string self { get; set; }
    }
}
