using System.Runtime.Serialization;
using Newtonsoft.Json;

namespace Altinn.Studio.Designer.RepositoryClient.Model
{
    [DataContract]
    public class FileLinksResponse
    {
        [JsonProperty("git")]
        public string Git { get; set; }

        [JsonProperty("html")]
        public string Html { get; set; }

        [JsonProperty("self")]
        public string Self { get; set; }
    }
}
