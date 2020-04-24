using Microsoft.Azure.WebJobs;
using Microsoft.Extensions.Configuration;

namespace Altinn.Platform.Storage.CosmosBackup
{
    /// <summary>
    /// Helper class for loding configurations.
    /// </summary>
    public static class ConfigHelper
    {
        /// <summary>
        /// Loads configuration.
        /// </summary>
        /// <param name="context">Execution context.</param>
        /// <returns>Configuration object.</returns>
        public static IConfiguration LoadConfig(ExecutionContext context)
        {
            IConfiguration config = new ConfigurationBuilder()
                .SetBasePath(context.FunctionAppDirectory)
                .AddJsonFile("local.settings.json", optional: true, reloadOnChange: true)
                .AddEnvironmentVariables()
                .Build();

            return config;
        }
    }
}
