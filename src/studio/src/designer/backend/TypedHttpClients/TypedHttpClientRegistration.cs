using System;
using System.Net.Http;
using System.Net.Http.Headers;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Constants;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Infrastructure.Models;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.AltinnAuthentication;
using Altinn.Studio.Designer.TypedHttpClients.AltinnAuthorization;
using Altinn.Studio.Designer.TypedHttpClients.AltinnStorage;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps;
using Altinn.Studio.Designer.TypedHttpClients.DelegatingHandlers;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.Studio.Designer.TypedHttpClients
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
            services.AddHttpClient();
            services.AddTransient<PlatformBearerTokenHandler>();
            services.AddAzureDevOpsTypedHttpClient(config);
            services.AddGiteaTypedHttpClient(config);
            services.AddAltinnAuthenticationTypedHttpClient(config);
            services.AddAuthenticatedAltinnPlatformTypedHttpClient
                <IAltinnStorageAppMetadataClient, AltinnStorageAppMetadataClient>();
            services.AddAuthenticatedAltinnPlatformTypedHttpClient
                <IAltinnAuthorizationPolicyClient, AltinnAuthorizationPolicyClient>();
            services.AddAuthenticatedAltinnPlatformTypedHttpClient
                <IAltinnStorageTextResourceClient, AltinnStorageTextResourceClient>();

            return services;
        }

        private static IHttpClientBuilder AddAzureDevOpsTypedHttpClient(this IServiceCollection services, IConfiguration config)
        {
            AzureDevOpsSettings azureDevOpsSettings = config.GetSection("Integrations:AzureDevOpsSettings").Get<AzureDevOpsSettings>();
            string token = config["AccessTokenDevOps"];
            return services.AddHttpClient<IAzureDevOpsBuildClient, AzureDevOpsBuildClient>(client =>
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
                    ServiceRepositorySettings serviceRepSettings = config.GetSection("ServiceRepositorySettings").Get<ServiceRepositorySettings>();
                    Uri uri = new Uri(serviceRepSettings.ApiEndPoint);
                    httpClient.BaseAddress = uri;
                    httpClient.DefaultRequestHeaders.Add(
                        General.AuthorizationTokenHeaderName,
                        AuthenticationHelper.GetDeveloperTokenHeaderValue(httpContextAccessor.HttpContext));
                })
                .ConfigurePrimaryHttpMessageHandler(() =>
                    new HttpClientHandler
                    {
                        AllowAutoRedirect = true
                    });

        private static IHttpClientBuilder AddAltinnAuthenticationTypedHttpClient(this IServiceCollection services, IConfiguration config)
            => services.AddHttpClient<IAltinnAuthenticationClient, AltinnAuthenticationClient>((sp, httpClient) =>
                {
                    httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
                })
                .AddHttpMessageHandler<EnsureSuccessHandler>();

        private static IHttpClientBuilder AddAuthenticatedAltinnPlatformTypedHttpClient<TInterface, TImplementation>(this IServiceCollection services)
            where TImplementation : class, TInterface
            where TInterface : class
            => services.AddHttpClient<TInterface, TImplementation>((sp, httpClient) =>
                {
                    httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
                })
                .AddHttpMessageHandler<PlatformBearerTokenHandler>()
                .AddHttpMessageHandler<EnsureSuccessHandler>();
    }
}
