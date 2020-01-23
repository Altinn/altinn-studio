using Newtonsoft.Json;

namespace Altinn.Studio.Designer.Models
{
    /// <summary>
    /// Represents the model Gitea returns when asking for contents and metadata for a file
    /// </summary>
    public class GiteaFileContent
    {
        /// <summary>
        /// Name of the file with file extension
        /// </summary>
        [JsonProperty("name")]
        public string Name { get; set; }

        /// <summary>
        /// Full SHA commit
        /// </summary>
        [JsonProperty("sha")]
        public string Sha { get; set; }

        /// <summary>
        /// Encoding contains the encoding used to encode this.Content
        /// Encoding is populated when type is file, otherwise null
        /// </summary>
        [JsonProperty("encoding")]
        public string Encoding { get; set; }

        /// <summary>
        /// The file content encoded with this.Encoding
        /// Content is populated when type is file, otherwise null
        /// </summary>
        [JsonProperty("content")]
        public string Content { get; set; }
    }
}
