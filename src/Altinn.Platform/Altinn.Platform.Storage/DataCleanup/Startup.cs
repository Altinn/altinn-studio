using Altinn.Platform.Storage.DataCleanup;
using Altinn.Platform.Storage.DataCleanup.Services;

using Microsoft.ApplicationInsights.Extensibility;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Hosting;
using Microsoft.Extensions.DependencyInjection;

[assembly: WebJobsStartup(typeof(Startup))]

namespace Altinn.Platform.Storage.DataCleanup
{
    /// <summary>
    /// The data cleanup startup
    /// </summary>
    public class Startup : IWebJobsStartup
    {
        /// <summary>
        /// Gets data cleanup project configuration
        /// </summary>
        public void Configure(IWebJobsBuilder builder)
        {
            builder.Services.AddSingleton<ICosmosService, CosmosService>();
            builder.Services.AddSingleton<IBackupBlobService, BackupBlobService>();
            builder.Services.AddSingleton<IBlobService, BlobService>();
            builder.Services.AddSingleton<IKeyVaultService, KeyVaultService>();
            builder.Services.AddSingleton<ISasTokenProvider, SasTokenProvider>();
        }
    }
}
