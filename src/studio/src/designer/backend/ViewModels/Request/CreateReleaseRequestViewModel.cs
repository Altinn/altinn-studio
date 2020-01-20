using System.ComponentModel.DataAnnotations;
using Newtonsoft.Json;

namespace Altinn.Studio.Designer.ViewModels.Request
{
    /// <summary>
    /// Viewmodel for creating a release
    /// </summary>
    public class CreateReleaseRequestViewModel
    {
        /// <summary>
        /// TagName
        /// </summary>
        [Required]
        [JsonProperty("tagName")]
        public string TagName { get; set; }

        /// <summary>
        /// Name
        /// </summary>
        [Required]
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
        [Required]
        [JsonProperty("targetCommitish")]
        public string TargetCommitish { get; set; }
    }
}
