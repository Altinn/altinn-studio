using System;
using AltinnCore.Designer.Infrastructure.Models;
using AltinnCore.Designer.TypedHttpClients.AzureDevOps;
using AltinnCore.Designer.TypedHttpClients.DelegatingHandlers;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AltinnCore.Designer.TypedHttpClients
{
    /// <summary>
    /// Contains extension methods to register typed http clients
    /// </summary>
    public static class TypedHttpClientRegistration
    {
        /// <summary>
        /// Sets up and registers all typed Http clients to DI container
        /// </summary>
        /// <param name="services">The Microsoft.Extensions.DependencyInjection.IServiceCollection for adding services.</param>
        /// <param name="config">The Microsoft.Extensions.Configuration.IConfiguration for </param>
        /// <returns></returns>
        public static IServiceCollection RegisterTypedHttpClients(this IServiceCollection services, IConfiguration config)
        {
            var azureDevOpsSettings = config.GetSection("Integrations:AzureDevOpsSettings").Get<AzureDevOpsSettings>();

            services.AddHttpClient<IAzureDevOpsBuildService, AzureDevOpsBuildService>(client =>
            {
                client.BaseAddress = new Uri(azureDevOpsSettings.BaseUri);
                client.DefaultRequestHeaders.Add("Content-Type", "application/json");
            }).AddHttpMessageHandler<EnsureSuccessHandler>();

            return services;
        }
    }
}
