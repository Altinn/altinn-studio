using Newtonsoft.Json;

namespace Altinn.Studio.Designer.Models
{
    /// <summary>
    /// Represents Git tree structure for a repository
    /// Note: The rest of the model has not been implemented yet because the need was only the full sha
    /// </summary>
    public class GitTreeStructure
    {
        /// <summary>
        /// Represents the full sha
        /// </summary>
        [JsonProperty("sha")]
        public string Sha { get; set; }
    }
}
