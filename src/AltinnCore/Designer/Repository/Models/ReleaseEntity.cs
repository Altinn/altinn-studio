using Newtonsoft.Json;

namespace AltinnCore.Designer.Repository.Models
{
    /// <summary>
    /// Release entity for a db
    /// </summary>
    public class ReleaseEntity : EntityBase
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
        /// TargetCommitish
        /// </summary>
        [JsonProperty("target_commitish")]
        public string TargetCommitish { get; set; }

        /// <summary>
        /// Build
        /// </summary>
        [JsonProperty("build")]
        public BuildEntity Build { get; set; }
    }
}
