using System;
using AltinnCore.Designer.Infrastructure.Models;
using AltinnCore.Designer.Repository;
using Microsoft.Azure.Documents;
using Microsoft.Azure.Documents.Client;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace AltinnCore.Designer.Infrastructure
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
            var azureCosmosDb = configuration.GetSection("Integrations").Get<Integrations>().AzureCosmosDbSettings;
            var endPointUri = new Uri(azureCosmosDb.EndpointUri);
            services.AddSingleton<IDocumentClient>(x =>
            {
                var documentClient = new DocumentClient(endPointUri, azureCosmosDb.MasterKey, connectionPolicy);
                documentClient.OpenAsync();
                return documentClient;
            });
            services.AddSingleton<IDocumentDbRepository, DocumentDbRepository>();

            return services;
        }
    }
}
