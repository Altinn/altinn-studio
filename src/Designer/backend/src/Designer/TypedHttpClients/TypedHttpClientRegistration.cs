using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Mime;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Infrastructure.Models;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpclients.DelegatingHandlers;
using Altinn.Studio.Designer.TypedHttpClients.Altinn2Metadata;
using Altinn.Studio.Designer.TypedHttpClients.AltinnAuthentication;
using Altinn.Studio.Designer.TypedHttpClients.AltinnAuthorization;
using Altinn.Studio.Designer.TypedHttpClients.AltinnStorage;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps;
using Altinn.Studio.Designer.TypedHttpClients.DelegatingHandlers;
using Altinn.Studio.Designer.TypedHttpClients.KubernetesWrapper;
using Altinn.Studio.Designer.TypedHttpClients.MaskinPorten;
using Altinn.Studio.Designer.TypedHttpClients.ResourceRegistryOptions;
using Altinn.Studio.Designer.TypedHttpClients.Slack;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

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
            services.AddTransient<AzureDevOpsTokenDelegatingHandler>();
            services.AddTransient<EnsureSuccessHandler>();
            services.AddTransient<PlatformBearerTokenHandler>();
            services.AddAzureDevOpsTypedHttpClient(config);
            // Order is important here. The GiteaBot client must be registered before the regular Gitea client
            // to ensure that the regular Gitea client is injected when IGitea is requested.
            services.AddGiteaBotTypedHttpClient(config);
            services.AddGiteaTypedHttpClient(config);
            services.AddAltinnAuthenticationTypedHttpClient(config);
            services.AddAuthenticatedAltinnPlatformTypedHttpClient
                <IAltinnStorageAppMetadataClient, AltinnStorageAppMetadataClient>();
            services.AddAuthenticatedAltinnPlatformTypedHttpClient
                <IAltinnAuthorizationPolicyClient, AltinnAuthorizationPolicyClient>();
            services.AddAuthenticatedAltinnPlatformTypedHttpClient
                <IAltinnStorageTextResourceClient, AltinnStorageTextResourceClient>();
            services.AddKubernetesWrapperTypedHttpClient();
            services.AddHttpClient<IPolicyOptions, PolicyOptionsClient>();
            services.AddHttpClient<IResourceRegistryOptions, ResourceRegistryOptionsClients>();
            services.AddHttpClient<IAltinn2MetadataClient, Altinn2MetadataClient>();
            services.AddTransient<GiteaTokenDelegatingHandler>();
            services.AddTransient<GitOpsBotTokenDelegatingHandler>();
            services.AddTransient<PlatformSubscriptionAuthDelegatingHandler>();
            services.AddMaskinportenHttpClient();
            services.AddSlackClient(config);

            return services;
        }

        private static IHttpClientBuilder AddAzureDevOpsTypedHttpClient(this IServiceCollection services, IConfiguration config)
        {
            AzureDevOpsSettings azureDevOpsSettings = config.GetSection("Integrations:AzureDevOpsSettings").Get<AzureDevOpsSettings>();
            string token = config["AccessTokenDevOps"];
            return services.AddHttpClient<IAzureDevOpsBuildClient, AzureDevOpsBuildClient>(client =>
            {
                client.BaseAddress = new Uri($"{azureDevOpsSettings.BaseUri}");
                client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", token);
            }).AddHttpMessageHandler<AzureDevOpsTokenDelegatingHandler>().AddHttpMessageHandler<EnsureSuccessHandler>();
        }

        private static IHttpClientBuilder AddKubernetesWrapperTypedHttpClient(this IServiceCollection services)
        {
            return services.AddHttpClient<IKubernetesWrapperClient, KubernetesWrapperClient>();
            // Commented due to the issue with deployments endpoint described in issue: https://github.com/Altinn/altinn-studio/issues/12037
            // .AddHttpMessageHandler<EnsureSuccessHandler>()
            // .AddHttpMessageHandler(sp => new CachingDelegatingHandler(sp.GetService<IMemoryCache>(), 15));
        }

        private static IHttpClientBuilder AddGiteaTypedHttpClient(this IServiceCollection services,
            IConfiguration config)
            => services.AddHttpClient<IGitea, GiteaAPIWrapper>((_, httpClient) =>
                {
                    ServiceRepositorySettings serviceRepoSettings =
                        config.GetSection(nameof(ServiceRepositorySettings)).Get<ServiceRepositorySettings>();
                    Uri uri = new Uri(serviceRepoSettings.ApiEndPoint);
                    httpClient.BaseAddress = uri;
                })
                .ConfigurePrimaryHttpMessageHandler((sp) =>
                {
                    var handler = new HttpClientHandler { AllowAutoRedirect = true };

                    return new Custom401Handler(handler);
                })
                .AddHttpMessageHandler<GiteaTokenDelegatingHandler>();

        private static IHttpClientBuilder AddGiteaBotTypedHttpClient(this IServiceCollection services,
            IConfiguration config)
        {
            // Register the named HTTP client (for direct IHttpClientFactory usage)
            var builder = services.AddHttpClient<IGitea, GiteaAPIWrapper>("bot-auth", (_, httpClient) =>
                {
                    ServiceRepositorySettings serviceRepoSettings =
                        config.GetSection(nameof(ServiceRepositorySettings)).Get<ServiceRepositorySettings>();
                    Uri uri = new Uri(serviceRepoSettings.ApiEndPoint);
                    httpClient.BaseAddress = uri;
                })
                .ConfigurePrimaryHttpMessageHandler((sp) =>
                {
                    var handler = new HttpClientHandler { AllowAutoRedirect = true };

                    return new Custom401Handler(handler);
                })
                .AddHttpMessageHandler<GitOpsBotTokenDelegatingHandler>();

            // Register keyed service by delegating to the named HTTP client registration
            services.AddKeyedTransient<IGitea>("bot-auth", (sp, _) =>
            {
                // Leverage the existing typed HTTP client factory instead of manual construction
                var httpClientFactory = sp.GetRequiredService<IHttpClientFactory>();
                var namedClient = httpClientFactory.CreateClient("bot-auth");

                // Use the same dependencies that the named client would use
                var serviceRepoSettings = sp.GetRequiredService<IConfiguration>()
                    .GetSection(nameof(ServiceRepositorySettings)).Get<ServiceRepositorySettings>();
                var httpContextAccessor = sp.GetRequiredService<IHttpContextAccessor>();
                var memoryCache = sp.GetRequiredService<IMemoryCache>();
                var logger = sp.GetRequiredService<ILogger<GiteaAPIWrapper>>();

                return new GiteaAPIWrapper(serviceRepoSettings, httpContextAccessor, memoryCache, logger, namedClient);
            });

            return builder;
        }

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
                    httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue(MediaTypeNames.Application.Json));
                })
                .AddHttpMessageHandler<PlatformBearerTokenHandler>()
                .AddHttpMessageHandler<PlatformSubscriptionAuthDelegatingHandler>()
                .AddHttpMessageHandler<EnsureSuccessHandler>();

        private static IHttpClientBuilder AddMaskinportenHttpClient(this IServiceCollection services)
        {
            services.AddScoped<AnsattPortenTokenDelegatingHandler>();
            return services.AddHttpClient<IMaskinPortenHttpClient, MaskinPortenHttpClient>((serviceProvider, client) =>
                    {
                        var options = serviceProvider.GetRequiredService<IOptions<MaskinPortenHttpClientSettings>>().Value;
                        client.BaseAddress = new Uri(options.BaseUrl);
                    })
            .AddHttpMessageHandler<AnsattPortenTokenDelegatingHandler>();

        }

        private static IHttpClientBuilder AddSlackClient(this IServiceCollection services, IConfiguration config)
        {
            FeedbackFormSettings feedbackFormSettings = config.GetSection("FeedbackFormSettings").Get<FeedbackFormSettings>();
            string token = config["FeedbackFormSlackToken"];
            return services.AddHttpClient<ISlackClient, SlackClient>(client =>
            {
                client.BaseAddress = new Uri(feedbackFormSettings.SlackSettings.WebhookUrl + config["FeedbackFormSlackWebhookSecret"]);
                client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", token);
            }).AddHttpMessageHandler<EnsureSuccessHandler>();
        }
    }
}
