using System.IO;
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
        /// <summary>
        /// Configure data protection on the services collection.
        /// </summary>
        /// <param name="services">The service collections</param>
        public static void ConfigureDataProtection(this IServiceCollection services)
        {
            services
                .AddDataProtection()
                .PersistKeysToFileSystem(GetKeysDirectory());
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
