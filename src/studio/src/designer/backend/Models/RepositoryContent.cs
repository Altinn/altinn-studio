using Altinn.Studio.Designer.Enums;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace Altinn.Studio.Designer.Models
{
    /// <summary>
    /// content of the repository
    /// </summary>
    public class RepositoryContent
    {
        /// <summary>
        /// Gets or sets the path of the file 
        /// </summary>
        public string FilePath { get; set; }

        /// <summary>
        /// The files status for the given file
        /// </summary>
        [JsonConverter(typeof(StringEnumConverter))]
        public FileStatus FileStatus { get; set; }
    }
}
