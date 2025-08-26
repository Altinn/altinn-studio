using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models
{
    /// <summary>
    /// Represents the model Gitea returns when asking for contents and metadata for a file
    /// </summary>
    public class FileSystemObject
    {
        /// <summary>
        /// Name of the file with file extension
        /// </summary>
        [JsonPropertyName("name")]
        public string Name { get; set; }

        /// <summary>
        /// Blob SHA of the file.
        /// Changes when the file content changes.
        /// </summary>
        [JsonPropertyName("sha")]
        public string Sha { get; set; }

        /// <summary>
        /// The encoding used for the Content property.
        /// Populated when Type is "file"; otherwise null.
        /// </summary>
        [JsonPropertyName("encoding")]
        public string Encoding { get; set; }

        /// <summary>
        /// The file content encoded with this.Encoding
        /// Content is populated when type is file, otherwise null
        /// </summary>
        [JsonPropertyName("content")]
        public string Content { get; set; }

        /// <summary>
        /// The file path
        /// </summary>
        [JsonPropertyName("path")]
        public string Path { get; set; }

        /// <summary>
        /// The object type
        /// </summary>
        [JsonPropertyName("type")]
        public string Type { get; set; }
    }
}
