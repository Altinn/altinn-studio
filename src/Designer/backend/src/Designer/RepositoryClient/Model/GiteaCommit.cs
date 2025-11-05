#nullable disable
using System.Collections.Generic;
using System.Runtime.Serialization;
using Newtonsoft.Json;

namespace Altinn.Studio.Designer.RepositoryClient.Model
{
    [DataContract]
    public class GiteaCommit
    {
        [JsonProperty("author")]
        public GiteaUser Author { get; set; }

        [JsonProperty("commit")]
        public GiteaRepoCommitInfo Commit { get; set; }

        [JsonProperty("committer")]
        public GiteaUser Committer { get; set; }

        [JsonProperty("created")]
        public string Created { get; set; }

        [JsonProperty("files")]
        public List<CommitAffectedFile> Files { get; set; }

        [JsonProperty("html_url")]
        public string HtmlUrl { get; set; }

        [JsonProperty("parents")]
        public List<GiteaRepoCommitMeta> Parents { get; set; }

        [JsonProperty("sha")]
        public string Sha { get; set; }

        [JsonProperty("stats")]
        public GiteaRepoCommitStats Stats { get; set; }

        [JsonProperty("url")]
        public string Url { get; set; }
    }
}
