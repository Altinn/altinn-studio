using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace AltinnCore.ServiceLibrary.ServiceMetadata
{
    /// <summary>
    /// Class representation for the metadata for a service
    /// </summary>
    public class ServiceMetadata
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
        public string Service { get; set; }

        /// <summary>
        /// Gets or sets the service edition
        /// </summary>
        [Required]
        public string Edition { get; set; }

        /// <summary>
        /// Gets or sets all elements for the service (<see cref="ElementMetadata"/>)
        /// </summary>
        public Dictionary<string, ElementMetadata> Elements { get; set; }
    }
}
