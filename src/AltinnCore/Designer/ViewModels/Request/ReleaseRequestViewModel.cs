using Newtonsoft.Json;

namespace AltinnCore.Designer.ViewModels.Request
{
    /// <summary>
    /// Viewmodel for release
    /// </summary>
    public class ReleaseRequestViewModel
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
    }
}
