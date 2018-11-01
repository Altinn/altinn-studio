using System.ComponentModel.DataAnnotations;

namespace AltinnCore.ServiceLibrary.Configuration
{
    /// <summary>
    /// Class representation for basic service configuration
    /// </summary>
    public class ServiceConfiguration
    {
        /// <summary>
        /// Gets or sets the service code
        /// </summary>
        [RegularExpression("^[a-zA-Z][a-zA-Z0-9_\\-]{2,30}$", ErrorMessage = "Må begynne med en bokstav og ikke inneholde mellomrom eller spesialtegn ('-' er tillatt)")]
        public string Code { get; set; }

        /// <summary>
        /// Gets or sets the name of the service
        /// </summary>
        public string Name { get; set; }

        /// <summary>
        /// Gets or sets the name of the service implementation
        /// </summary>
        public string ServiceImplementation { get; set; }
    }
}
