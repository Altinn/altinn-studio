using Newtonsoft.Json;

namespace AltinnCore.Designer.Repository.Models
{
    /// <summary>
    /// Release document for Document db
    /// </summary>
    public class ReleaseDocument : DocumentBase
    {
        /// <summary>
        /// TagName
        /// </summary>
        [JsonProperty("tag_name")]
        public string TagName { get; set; }

        /// <summary>
        /// Name
        /// </summary>
        [JsonProperty("name")]
        public string Name { get; set; }

        /// <summary>
        /// Body
        /// </summary>
        [JsonProperty("body")]
        public string Body { get; set; }

        /// <summary>
        /// Application name
        /// </summary>
        [JsonProperty("app")]
        public string App { get; set; }

        /// <summary>
        /// Organisation name
        /// </summary>
        [JsonProperty("org")]
        public string Org { get; set; }

        /// <summary>
        /// TargetCommitish
        /// </summary>
        [JsonProperty("target_commitish")]
        public string TargetCommitish { get; set; }

        /// <summary>
        /// Build
        /// </summary>
        [JsonProperty("build")]
        public BuildDocument Build { get; set; }
    }
}
