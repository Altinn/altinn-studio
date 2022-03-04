using System.ComponentModel.DataAnnotations;
using Altinn.Studio.Designer.Enums;

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
        [RegularExpression("^[a-zA-Z]+[a-zA-Z0-9_]*$", ErrorMessage = "Må begynne med en bokstav og ikke inneholde mellomrom eller spesialtegn ('_' er tillatt)")]
        public string RepositoryName { get; set; }

        /// <summary>
        /// Gets or sets the name of the service implementation
        /// </summary>
        public string ServiceImplementation { get; set; }

        /// <summary>
        /// Gets or sets the name of the service
        /// </summary>
        public string ServiceName { get; set; }

        /// <summary>
        /// Gets or sets the id of the service
        /// </summary>
        public string ServiceId { get; set; }

        /// <summary>
        /// Gets or sets the description of the
        /// </summary>
        public string ServiceDescription { get; set; }

        /// <summary>
        /// The prefered way of doing datamodelling within this repository. See <see cref="DatamodellingPreference"/>
        /// </summary>
        public DatamodellingPreference DatamodellingPreference { get; set; }
    }
}
