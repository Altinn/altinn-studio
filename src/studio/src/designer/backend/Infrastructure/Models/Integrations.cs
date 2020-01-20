namespace Altinn.Studio.Designer.Infrastructure.Models
{
    /// <summary>
    /// Settings file for integrations base uris
    /// </summary>
    public class Integrations
    {
        /// <summary>
        /// Settings for Azure Cosmos Db
        /// </summary>
        public AzureCosmosDbSettings AzureCosmosDbSettings { get; set; }

        /// <summary>
        /// Settings for Azure DevOps
        /// </summary>
        public AzureDevOpsSettings AzureDevOpsSettings { get; set; }
    }
}
