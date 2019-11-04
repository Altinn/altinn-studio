using System;
using System.Net.Http;
using System.Net.Http.Headers;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Constants;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Services.Implementation;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.Designer.Infrastructure.Models;
using AltinnCore.Designer.TypedHttpClients.AltinnStorage;
using AltinnCore.Designer.TypedHttpClients.AzureDevOps;
using AltinnCore.Designer.TypedHttpClients.DelegatingHandlers;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

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
        /// <returns>IServiceCollection</returns>
        public static IServiceCollection RegisterTypedHttpClients(this IServiceCollection services, IConfiguration config)
        {
            services.AddTransient<EnsureSuccessHandler>();

            services.AddAzureDevOpsTypedHttpClient(config);
            services.AddGiteaTypedHttpClient(config);
            services.AddAltinnStorageTypedHttpClient();

            return services;
        }

        private static IHttpClientBuilder AddAzureDevOpsTypedHttpClient(this IServiceCollection services, IConfiguration config)
        {
            AzureDevOpsSettings azureDevOpsSettings = config.GetSection("Integrations:AzureDevOpsSettings").Get<AzureDevOpsSettings>();
            string token = config["AccessTokenDevOps"];
            return services.AddHttpClient<IAzureDevOpsBuildService, AzureDevOpsBuildService>(client =>
            {
                client.BaseAddress = new Uri($"{azureDevOpsSettings.BaseUri}build/builds/");
                client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", token);
            }).AddHttpMessageHandler<EnsureSuccessHandler>();
        }

        private static IHttpClientBuilder AddGiteaTypedHttpClient(this IServiceCollection services, IConfiguration config)
            => services.AddHttpClient<IGitea, GiteaAPIWrapper>((sp, httpClient) =>
                {
                    IHttpContextAccessor httpContextAccessor = sp.GetRequiredService<IHttpContextAccessor>();
                    IConfigurationSection serviceRepSettings = config.GetSection("ServiceRepositorySettings");
                    string uriString = serviceRepSettings["ApiEndPoint"];
                    Uri uri = new Uri(uriString + "/");
                    httpClient.BaseAddress = uri;
                    httpClient.DefaultRequestHeaders.Add(
                        General.AuthorizationTokenHeaderName,
                        AuthenticationHelper.GetDeveloperTokenHeaderValue(httpContextAccessor.HttpContext));
                })
                .AddHttpMessageHandler<EnsureSuccessHandler>()
                .ConfigurePrimaryHttpMessageHandler(() =>
                    new HttpClientHandler
                    {
                        AllowAutoRedirect = true
                    });

        private static IHttpClientBuilder AddAltinnStorageTypedHttpClient(this IServiceCollection services)
            => services.AddHttpClient<IAltinnApplicationStorageService, AltinnApplicationStorageService>((sp, client) =>
            {
                PlatformSettings platformSettings = sp.GetRequiredService<IOptions<PlatformSettings>>().Value;
                client.BaseAddress = new Uri($"{platformSettings.GetApiStorageEndpoint}applications/");
            }).AddHttpMessageHandler<EnsureSuccessHandler>();
    }
}
