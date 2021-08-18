using System;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Infrastructure.Models;
using Altinn.Studio.Designer.Repository;
using Microsoft.Azure.Documents;
using Microsoft.Azure.Documents.Client;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.Studio.Designer.Infrastructure
{
    /// <summary>
    /// Contains extension methods for registering integrations
    /// </summary>
    public static class IntegrationRegistration
    {
        /// <summary>
        /// Extension method that registers integrations related classes to the DI container
        /// </summary>
        /// <param name="services">The Microsoft.Extensions.DependencyInjection.IServiceCollection for adding services.</param>
        /// <param name="configuration">The configuration for the project</param>
        public static IServiceCollection RegisterIntegrations(this IServiceCollection services, IConfiguration configuration)
        {
            ConnectionPolicy connectionPolicy = new ConnectionPolicy
            {
                ConnectionMode = ConnectionMode.Gateway,
                ConnectionProtocol = Protocol.Https,
            };
            AzureCosmosDbSettings azureCosmosDb = configuration.GetSection("Integrations").Get<Integrations>().AzureCosmosDbSettings;
            services.AddSingleton<IDocumentClient>(x =>
            {
                Uri endPointUri = new Uri(azureCosmosDb.EndpointUri);
                DocumentClient documentClient = new DocumentClient(endPointUri, azureCosmosDb.MasterKey, connectionPolicy);
                documentClient.OpenAsync().GetAwaiter().GetResult();
                documentClient.CreateDatabaseIfNotExistsAsync(new Database { Id = azureCosmosDb.Database }).GetAwaiter().GetResult();

                return documentClient;
            });
            services.AddTransient<ReleaseRepository>();
            services.AddTransient<DeploymentRepository>();

            return services;
        }
    }
}
