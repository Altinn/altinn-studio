using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Altinn.Platform.Storage.Configuration
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
        /// name of the storage container in the storage account
        /// </summary>
        public string StorageContainer { get; set; }

        /// <summary>
        /// url for the blob end point
        /// </summary>
        public string BlobEndPoint { get; set; }
    }
}
