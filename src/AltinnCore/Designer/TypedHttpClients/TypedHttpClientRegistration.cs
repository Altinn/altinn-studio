using System;
using System.Net.Http.Headers;
using System.Text;
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
            services.AddTransient<EnsureSuccessHandler>();

            AzureDevOpsSettings azureDevOpsSettings = config.GetSection("Integrations:AzureDevOpsSettings").Get<AzureDevOpsSettings>();
            string token = config["AccessTokenDevOps"];

            services.AddHttpClient<IAzureDevOpsBuildService, AzureDevOpsBuildService>(client =>
            {
                client.BaseAddress = new Uri(azureDevOpsSettings.BaseUri);
                client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", token);
            }).AddHttpMessageHandler<EnsureSuccessHandler>();

            return services;
        }
    }
}
