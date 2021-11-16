using System;
using System.IO;

using Altinn.Platform.Authentication.Configuration;

using Azure.Storage;
using Azure.Storage.Blobs;

using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.DataProtection.Repositories;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.Platform.Authentication.Extensions
{
    /// <summary>
    /// Configuration for DataProtection
    /// </summary>
    public static class DataProtectionConfiguration
    {
        private static string _blobName = "keys.xml";

        /// <summary>
        /// Configure data protection on the services collection.
        /// </summary>
        /// <param name="services">The service collections</param>
        /// <param name="isDevelopment">A boolean indicating if the environment is development</param>
        /// <param name="config">Configuration for Azure Storage</param>
        public static void ConfigureDataProtection(this IServiceCollection services, bool isDevelopment, AzureStorageConfiguration config)
        {
            if (isDevelopment)
            {
                services.AddDataProtection()
                   .PersistKeysToFileSystem(GetKeysDirectory());
            }
            else
            {
                StorageSharedKeyCredential metadataCredentials = new StorageSharedKeyCredential(config.MetadataAccountName, config.MetadataAccountKey);
                Uri uri = new Uri($"{config.MetadataBlobEndpoint}/{config.MetadataContainer}");
                BlobContainerClient container = new BlobContainerClient(uri, metadataCredentials);
                BlobClient client = container.GetBlobClient(_blobName);

                services.AddDataProtection()
                    .PersistKeysToAzureBlobStorage(client);
            }
        }

        /// <summary>
        /// Return a directory based on the running operating system. It is possible to override the directory based on the ALTINN_KEYS_DIRECTORY environment variable.
        /// </summary>
        /// <returns></returns>
        private static DirectoryInfo GetKeysDirectory()
        {
            string environmentVariable = System.Environment.GetEnvironmentVariable("ALTINN_KEYS_DIRECTORY");
            if (!string.IsNullOrWhiteSpace(environmentVariable))
            {
                return new DirectoryInfo(environmentVariable);
            }

            // Return a key directory based on the current operating system
            return FileSystemXmlRepository.DefaultKeyStorageDirectory;
        }
    }
}
