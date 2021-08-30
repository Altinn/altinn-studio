using Altinn.Studio.Designer.Configuration;

namespace Altinn.Studio.Designer.Infrastructure.Models
{
    /// <summary>
    /// Settings file for integrations base uris
    /// </summary>
    public class Integrations
    {
        /// <summary>
        /// Settings for Azure DevOps
        /// </summary>
        public AzureDevOpsSettings AzureDevOpsSettings { get; set; }

        /// <summary>
        /// Settings for PostgreSQL
        /// </summary>
        public PostgreSQLSettings PostgreSQLSettings { get; set; }
    }
}
