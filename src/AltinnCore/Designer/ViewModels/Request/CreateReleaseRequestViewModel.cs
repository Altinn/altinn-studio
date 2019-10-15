using Newtonsoft.Json;

namespace AltinnCore.Designer.ViewModels.Request
{
    /// <summary>
    /// Viewmodel for creating a release
    /// </summary>
    public class CreateReleaseRequestViewModel
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
    }
}
