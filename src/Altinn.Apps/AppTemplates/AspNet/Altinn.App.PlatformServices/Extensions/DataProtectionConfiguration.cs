using System.IO;
using System.Runtime.InteropServices;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.PlatformServices.Extensions
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
                .PersistKeysToFileSystem(new DirectoryInfo(GetKeysDirectory()));
        }

        /// <summary>
        /// Return a directory based on the running operating system. It is possible to override the directory based on the KEYS_DIRECTORY environment variable. 
        /// </summary>
        /// <returns></returns>
        private static string GetKeysDirectory()
        {
            var environmentVariable = System.Environment.GetEnvironmentVariable("ALTINN_KEYS_DIRECTORY");
            if (!string.IsNullOrWhiteSpace(environmentVariable))
            {
                return environmentVariable;
            }

            // Return a key directory based on the current operating system
            if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
            {
                // This is the default behaviour for keys in Windows.
                return Path.Combine(System.Environment.GetFolderPath(System.Environment.SpecialFolder.LocalApplicationData), "ASP.NET", "DataProtection-Keys");
            }

            // Assume *nix like systems
            return "/mnt/keys";
        }
    }
}
