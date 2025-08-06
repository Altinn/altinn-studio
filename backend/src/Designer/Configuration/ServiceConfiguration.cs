using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Altinn.Studio.Designer.Converters;
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
        /// Indicates whether the service is available for specific user types (e.g., private, enterprise)
        /// </summary>
        public AvailableForType AvailableForType { get; set; }

        /// <summary>
        /// Contact points for the service (e.g., support emails or phone numbers)
        /// </summary>
        public List<ContactPoint> ContactPoints { get; set; } = new List<ContactPoint>();

        /// <summary>
        /// Indicates whether enterprise users can access the service
        /// </summary>
        public bool EnterpriseUserEnabled { get; set; }

        /// <summary>
        /// URL to the homepage
        /// </summary>
        public string Homepage { get; set; }

        /// <summary>
        /// Indicates whether the service can be delegable
        /// </summary>
        public bool IsDelegable { get; set; }

        /// <summary>
        /// Name of the service in multiple languages
        /// </summary>
        [JsonConverter(typeof(LocalizedStringConverter))]
        public LocalizedString ServiceName { get; set; }

        /// <summary>
        /// ID of the service
        /// </summary>
        public string ServiceId { get; set; }

        /// <summary>
        /// Description of the service in multiple languages
        /// </summary>
        [JsonConverter(typeof(LocalizedStringConverter))]
        public LocalizedString Description { get; set; }

        /// <summary>
        /// Indicates whether self-identified users can access the service
        /// </summary>
        public bool SelfIdentifiedUserEnabled { get; set; }

        /// <summary>
        /// Status of the service
        /// </summary>
        public ServiceStatus Status { get; set; }

        /// <summary>
        /// Type of resource; must be 'altinnapp'
        /// </summary>
        [RegularExpression("^altinnapp$", ErrorMessage = "ResourceType must be 'altinnapp'.")]
        public string ResourceType { get; set; }

        /// <summary>
        /// Repository name; must start with a letter and only contain letters, numbers or underscores
        /// </summary>
        [RegularExpression("^[a-zA-Z]+[a-zA-Z0-9_]*$",
            ErrorMessage = "Must start with a letter and cannot contain spaces or special characters (only '_' is allowed)")]
        public string RepositoryName { get; set; }

        /// <summary>
        /// Description of the rights
        /// </summary>
        [JsonConverter(typeof(LocalizedStringConverter))]
        public LocalizedString RightDescription { get; set; }

        /// <summary>
        /// List of keywords associated with the service
        /// </summary>
        public List<Keyword> Keywords { get; set; } = new List<Keyword>();

        /// <summary>
        /// Indicates whether the service should be visible
        /// </summary>
        public bool Visible { get; set; }
    }
}
