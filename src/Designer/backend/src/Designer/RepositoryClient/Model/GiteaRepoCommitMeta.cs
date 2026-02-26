#nullable disable
using System.Runtime.Serialization;
using Newtonsoft.Json;

namespace Altinn.Studio.Designer.RepositoryClient.Model
{
    [DataContract]
    public class GiteaRepoCommitMeta
    {
        [JsonProperty("created")]
        public string Created { get; set; }

        [JsonProperty("sha")]
        public string Sha { get; set; }

        [JsonProperty("url")]
        public string Url { get; set; }
    }
}
