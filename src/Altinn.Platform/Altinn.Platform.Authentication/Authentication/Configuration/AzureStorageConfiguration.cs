using System.Diagnostics.CodeAnalysis;

namespace Altinn.Platform.Authentication.Configuration
{
    /// <summary>
    /// Settings for Azure storage
    /// </summary>
    [ExcludeFromCodeCoverage]
    public class AzureStorageConfiguration
    {
        /// <summary>
        /// The storage account name for Metadata
        /// </summary>
        public string KeysAccountName { get; set; }

        /// <summary>
        /// The storage account key for Metadata
        /// </summary>
        public string KeysAccountKey { get; set; }

        /// <summary>
        /// The name of the storage container in the Metadata storage account
        /// </summary>
        public string KeysContainer { get; set; }

        /// <summary>
        /// The url for the blob end point for Metadata
        /// </summary>
        public string KeysBlobEndpoint { get; set; }
    }
}
