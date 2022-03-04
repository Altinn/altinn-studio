using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using Newtonsoft.Json;

namespace Altinn.Studio.Designer.ModelMetadatalModels
{
    /// <summary>
    /// Class representation for the metadata for a service
    /// </summary>
    public class ModelMetadata
    {
        /// <summary>
        /// Gets or sets the organization the service belongs to
        /// </summary>
        [Required]
        public string Org { get; set; }

        /// <summary>
        /// Gets or sets the service short name
        /// </summary>
        [Required]
        public string ServiceName { get; set; }

        /// <summary>
        /// Gets or sets the repository name
        /// </summary>
        [Required]
        public string RepositoryName { get; set; }

        /// <summary>
        /// Gets or sets the service id
        /// </summary>
        public string ServiceId { get; set; }

        /// <summary>
        /// Gets or sets all elements for the service (<see cref="ElementMetadata"/>)
        /// </summary>
        [JsonProperty(PropertyName = "elements")]
        public Dictionary<string, ElementMetadata> Elements { get; set; } = new Dictionary<string, ElementMetadata>();
    }
}
