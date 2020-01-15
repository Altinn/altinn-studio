using Newtonsoft.Json;

namespace AltinnCore.Designer.Repository.Models
{
    /// <summary>
    /// Release entity for a db
    /// </summary>
    public class ReleaseEntity : BaseEntity
    {
        /// <summary>
        /// TagName
        /// </summary>
        [JsonProperty("tagName")]
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
        [JsonProperty("targetCommitish")]
        public string TargetCommitish { get; set; }

        /// <summary>
        /// Build
        /// </summary>
        [JsonProperty("build")]
        public BuildEntity Build { get; set; }
    }
}
