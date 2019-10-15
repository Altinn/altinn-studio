using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using AltinnCore.Common.Constants;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Services.Implementation;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.Designer.Infrastructure.Models;
using AltinnCore.Designer.TypedHttpClients.AzureDevOps;
using AltinnCore.Designer.TypedHttpClients.DelegatingHandlers;
using Microsoft.AspNetCore.Http;
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

            services.AddHttpClient<IGitea, GiteaAPIWrapper>((sp, httpClient) =>
            {
                IHttpContextAccessor httpContextAccessor = sp.GetRequiredService<IHttpContextAccessor>();
                IConfigurationSection serviceRepSettings = config.GetSection("ServiceRepositorySettings");
                string uriString = Environment.GetEnvironmentVariable("ServiceRepositorySettings__ApiEndPoint") ?? serviceRepSettings["ApiEndPoint"];
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

            return services;
        }
    }
}
