namespace Altinn.Platform.Authorization.Configuration
{
    /// <summary>
    /// Settings for Azure storage
    /// </summary>
    public class AzureStorageConfiguration
    {
        /// <summary>
        /// storage account name
        /// </summary>
        public string AccountName { get; set; }

        /// <summary>
        /// storage account key
        /// </summary>
        public string AccountKey { get; set; }

        /// <summary>
        /// name of the authorization storage container in the storage account
        /// </summary>
        public string MetadataContainer { get; set; }

        /// <summary>
        /// url for the blob end point
        /// </summary>
        public string BlobEndpoint { get; set; }
    }
}
