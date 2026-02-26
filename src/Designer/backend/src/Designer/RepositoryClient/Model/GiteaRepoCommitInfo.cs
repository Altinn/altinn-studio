#nullable disable
using System.Runtime.Serialization;
using Newtonsoft.Json;

namespace Altinn.Studio.Designer.RepositoryClient.Model
{
    [DataContract]
    public class GiteaRepoCommitInfo
    {
        [JsonProperty("author")]
        public GiteaRepoCommitUser Author { get; set; }

        [JsonProperty("committer")]
        public GiteaRepoCommitUser Committer { get; set; }

        [JsonProperty("message")]
        public string Message { get; set; }

        [JsonProperty("tree")]
        public GiteaRepoCommitMeta Meta { get; set; }

        [JsonProperty("url")]
        public string Url { get; set; }

        [JsonProperty("verification")]
        public GiteaRepoPayloadCommitVerification Verification { get; set; }
    }
}
