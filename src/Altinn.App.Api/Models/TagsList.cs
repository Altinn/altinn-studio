using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Altinn.App.Api.Models
{
    /// <summary>
    /// Represents the response from an API endpoint providing a list of tags.
    /// </summary>
    public class TagsList
    {
        /// <summary>
        /// A list of tags represented as sting values.
        /// </summary>
        [JsonPropertyName("tags")]
        public List<string> Tags { get; set; } = new List<string>();
    }
}
