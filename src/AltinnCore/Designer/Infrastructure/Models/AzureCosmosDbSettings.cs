namespace AltinnCore.Designer.Infrastructure.Models
{
    /// <summary>
    /// Settings for Azure Cosmos Db
    /// </summary>
    public class AzureCosmosDbSettings
    {
        /// <summary>
        /// The endpoint of the Azure Cosmos Db
        /// </summary>
        public string EndpointUri { get; set; }

        /// <summary>
        /// The master key for the Azure Cosmos Db
        /// </summary>
        public string MasterKey { get; set; }

        /// <summary>
        /// Database
        /// </summary>
        public string Database { get; set; }

        /// <summary>
        /// ReleaseCollection
        /// </summary>
        public string ReleaseCollection { get; set; }

        /// <summary>
        /// DeploymentCollection
        /// </summary>
        public string DeploymentCollection { get; set; }
    }
}
