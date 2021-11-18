using System;
using System.Diagnostics.CodeAnalysis;

using Altinn.Platform.Authentication.Configuration;

using Azure.Storage;
using Azure.Storage.Blobs;

using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.DataProtection.Repositories;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.Platform.Authentication.Extensions
{
    /// <summary>
    /// Configuration for DataProtection
    /// </summary>
    [ExcludeFromCodeCoverage]
    public static class DataProtectionConfiguration
    {
        private static string _blobName = "keys.xml";
        private static AzureStorageConfiguration _config;

        /// <summary>
        /// Configure data protection on the services collection.
        /// </summary>
        /// <param name="services">The service collections</param>
        /// <param name="isDevelopment">A boolean indicating if the environment is development</param>
        /// <param name="config">Configuration for Azure Storage</param>
        public static void ConfigureDataProtection(this IServiceCollection services, bool isDevelopment, IConfigurationSection config)
        {
            _config = config.Get<AzureStorageConfiguration>();

            if (isDevelopment)
            {
                services.AddDataProtection()
                   .PersistKeysToFileSystem(FileSystemXmlRepository.DefaultKeyStorageDirectory);
            }
            else
            {
                StorageSharedKeyCredential keysCredentials = new StorageSharedKeyCredential(_config.KeysAccountName, _config.KeysAccountKey);
                Uri uri = new Uri($"{_config.KeysBlobEndpoint}/{_config.KeysContainer}");
                BlobContainerClient container = new BlobContainerClient(uri, keysCredentials);
                BlobClient client = container.GetBlobClient(_blobName);

                services.AddDataProtection()
                    .PersistKeysToAzureBlobStorage(client);
            }
        }
    }
}
