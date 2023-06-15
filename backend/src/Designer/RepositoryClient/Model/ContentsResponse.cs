#nullable enable
using System.Runtime.Serialization;
using Newtonsoft.Json;

namespace Altinn.Studio.Designer.RepositoryClient.Model
{
    [DataContract]
    public class ContentsResponse
    {
        [JsonProperty("_links")]
        public FileLinksResponse Links { get; set; }

        [JsonProperty("content")]
        public string? Content { get; set; }

        [JsonProperty("download_url")]
        public string DownloadUrl { get; set; }

        [JsonProperty("encoding")]
        public string? Encoding { get; set; }

        [JsonProperty("git_url")]
        public string GitUrl { get; set; }

        [JsonProperty("html_url")]
        public string HtmlUrl { get; set; }

        [JsonProperty("last_commit_sha")]
        public string LastCommitSha { get; set; }

        [JsonProperty("name")]
        public string Name { get; set; }

        [JsonProperty("path")]
        public string Path { get; set; }

        [JsonProperty("sha")]
        public string Sha { get; set; }

        [JsonProperty("size")]
        public int Size { get; set; }

        [JsonProperty("submodule_git_url")]
        public string SubmoduleGitUrl { get; set; }

        [JsonProperty("target")]
        public string? Target { get; set; }

        [JsonProperty("type")]
        public string Type { get; set; }

        [JsonProperty("url")]
        public string Url { get; set; }
    }
}
