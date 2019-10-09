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
        /// Collection
        /// </summary>
        public string Collection { get; set; }
    }
}
