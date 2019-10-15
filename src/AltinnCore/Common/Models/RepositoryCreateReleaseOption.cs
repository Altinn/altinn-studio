using Newtonsoft.Json;

namespace AltinnCore.Common.Models
{
    /// <summary>
    /// RepositoryCreateReleaseOption options when creating release
    /// </summary>
    public class RepositoryCreateReleaseOption
    {
        /// <summary>
        /// Body of the release
        /// </summary>
        [JsonProperty("body")]
        public string Body { get; set; }

        /// <summary>
        /// If the release is a draft or not
        /// </summary>
        [JsonProperty("draft")]
        public bool Draft { get; set; }

        /// <summary>
        /// Name of the release
        /// </summary>
        [JsonProperty("name")]
        public string Name { get; set; }

        /// <summary>
        /// If the release is marked as pre-release or not
        /// </summary>
        [JsonProperty("prerelease")]
        public bool PreRelease { get; set; }

        /// <summary>
        /// The tag name of the release
        /// </summary>
        [JsonProperty("tag_name")]
        public string TagName { get; set; }

        /// <summary>
        /// The target commitish, an identifier to a specific commit
        /// </summary>
        [JsonProperty("target_commitish")]
        public string TargetCommitish { get; set; }
    }
}
