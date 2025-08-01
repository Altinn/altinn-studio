using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Configuration
{
    /// <summary>
    /// Class representation for basic service configuration
    /// </summary>
    public class ServiceConfiguration
    {
        /// <summary>
        /// Gets or sets the repository name
        /// </summary>
        [RegularExpression("^[a-zA-Z]+[a-zA-Z0-9_]*$",
            ErrorMessage = "Må begynne med en bokstav og ikke inneholde mellomrom eller spesialtegn ('_' er tillatt)")]
        public string RepositoryName { get; set; }

        /// <summary>
        /// Gets or sets the name of the service
        /// </summary>
        [JsonConverter(typeof(LocalizedStringConverter))]
        public LocalizedString ServiceName { get; set; }

        /// <summary>
        /// Gets or sets the id of the service
        /// </summary>
        public string ServiceId { get; set; }

        /// <summary>
        /// Gets or sets the description of the
        /// </summary>
        [JsonConverter(typeof(LocalizedStringConverter))]
        public LocalizedString ServiceDescription { get; set; }

        [RegularExpression("^altinnapp$", ErrorMessage = "ResourceType must be 'altinnapp'.")]
        public string ResourceType { get; set; }

        public string Homepage { get; set; }
        public bool IsDelegable { get; set; }
        public ServiceStatus Status { get; set; }
        public bool SelfIdentifiedUserEnabled { get; set; }
        public bool EnterpriseUserEnabled { get; set; }
        public AvailableForType AvailableForType { get; set; }
        public List<ContactPoint> ContactPoints { get; set; } = new List<ContactPoint>();
        public bool Visible { get; set; }
    }
}




