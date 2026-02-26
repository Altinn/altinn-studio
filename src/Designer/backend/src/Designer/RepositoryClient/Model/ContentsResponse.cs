using System.Runtime.Serialization;
using Newtonsoft.Json;

namespace Altinn.Studio.Designer.RepositoryClient.Model
{
    [DataContract]
    public class ContentsResponse
    {
        [JsonProperty("_links")]
        public required FileLinksResponse Links { get; set; }

        [JsonProperty("content")]
        public required string? Content { get; set; }

        [JsonProperty("download_url")]
        public required string DownloadUrl { get; set; }

        [JsonProperty("encoding")]
        public required string? Encoding { get; set; }

        [JsonProperty("git_url")]
        public required string GitUrl { get; set; }

        [JsonProperty("html_url")]
        public required string HtmlUrl { get; set; }

        [JsonProperty("last_commit_sha")]
        public required string LastCommitSha { get; set; }

        [JsonProperty("name")]
        public required string Name { get; set; }

        [JsonProperty("path")]
        public required string Path { get; set; }

        [JsonProperty("sha")]
        public required string Sha { get; set; }

        [JsonProperty("size")]
        public required int Size { get; set; }

        [JsonProperty("submodule_git_url")]
        public required string SubmoduleGitUrl { get; set; }

        [JsonProperty("target")]
        public string? Target { get; set; }

        [JsonProperty("type")]
        public required string Type { get; set; }

        [JsonProperty("url")]
        public required string Url { get; set; }
    }
}
