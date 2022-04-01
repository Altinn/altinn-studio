namespace Altinn.Platform.Authorization.Configuration
{
    /// <summary>
    /// Settings for Azure storage
    /// </summary>
    public class AzureStorageConfiguration
    {
        /// <summary>
        /// The storage account name for Metadata
        /// </summary>
        public string MetadataAccountName { get; set; }

        /// <summary>
        /// The storage account key for Metadata
        /// </summary>
        public string MetadataAccountKey { get; set; }

        /// <summary>
        /// The name of the storage container in the Metadata storage account
        /// </summary>
        public string MetadataContainer { get; set; }

        /// <summary>
        /// The url for the blob end point for Metadata
        /// </summary>
        public string MetadataBlobEndpoint { get; set; }

        /// <summary>
        /// The storage account name for Delegations
        /// </summary>
        public string DelegationsAccountName { get; set; }

        /// <summary>
        /// The storage account key for Delegations
        /// </summary>
        public string DelegationsAccountKey { get; set; }

        /// <summary>
        /// The name of the storage container in the Delegations storage account
        /// </summary>
        public string DelegationsContainer { get; set; }

        /// <summary>
        /// The url for the blob end point for Delegations
        /// </summary>
        public string DelegationsBlobEndpoint { get; set; }

        /// <summary>
        /// The blob lease timeout value in seconds
        /// </summary>
        public int BlobLeaseTimeout { get; set; }

        /// <summary>
        /// The endpoint url for the storage account for delegation event queue
        /// </summary>
        public string DelegationEventQueueEndpoint { get; set; }

        /// <summary>
        /// The storage account name for delegation event queue
        /// </summary>
        public string DelegationEventQueueAccountName { get; set; }

        /// <summary>
        /// The account key for the storage account for delegation event queue
        /// </summary>
        public string DelegationEventQueueAccountKey { get; set; }
    }
}
