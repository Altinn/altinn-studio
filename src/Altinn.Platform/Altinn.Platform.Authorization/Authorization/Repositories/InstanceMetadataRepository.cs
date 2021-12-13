using System;
using System.Threading.Tasks;
using Altinn.Platform.Authorization.Configuration;
using Altinn.Platform.Authorization.Repositories.Interface;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Azure.Documents;
using Microsoft.Azure.Documents.Client;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Authorization.Repositories
{
    /// <summary>
    /// Repository for retrieving instance information
    /// </summary>
    public class InstanceMetadataRepository : IInstanceMetadataRepository
    {
        private readonly string databaseId;
        private readonly string instanceCollectionId;
        private readonly string applicationCollectionId;
        private readonly DocumentClient _client;
        private readonly AzureCosmosSettings _cosmosettings;
        private readonly ILogger<InstanceMetadataRepository> logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="InstanceMetadataRepository"/> class
        /// </summary>
        /// <param name="cosmosettings">the configuration settings for cosmos database</param>
        /// <param name="logger">the logger</param>
        public InstanceMetadataRepository(IOptions<AzureCosmosSettings> cosmosettings, ILogger<InstanceMetadataRepository> logger)
        {
            this.logger = logger;

            // Retrieve configuration values from appsettings.json
            _cosmosettings = cosmosettings.Value;

            ConnectionPolicy connectionPolicy = new ConnectionPolicy
            {
                ConnectionMode = ConnectionMode.Gateway,
                ConnectionProtocol = Protocol.Https,
            };

            _client = new DocumentClient(new Uri(_cosmosettings.EndpointUri), _cosmosettings.PrimaryKey, connectionPolicy);

            databaseId = _cosmosettings.Database;
            instanceCollectionId = _cosmosettings.InstanceCollection;
            applicationCollectionId = _cosmosettings.ApplicationCollection;
            _client.OpenAsync();
        }

        /// <inheritdoc/>
        public Task<Instance> GetInstance(string instanceId, int instanceOwnerId)
        {
            if (instanceOwnerId <= 0)
            {
                throw new ArgumentException("Instance owner id cannot be zero or negative");
            }

            return GetInstanceInternal(instanceId, instanceOwnerId);
        }

        /// <inheritdoc/>
        public async Task<Instance> GetInstance(string instanceId)
        {
            int instanceOwnerId = GetInstanceOwnerIdFromInstanceId(instanceId);
            return await GetInstance(instanceId, instanceOwnerId);
        }

        private async Task<Instance> GetInstanceInternal(string instanceId, int instanceOwnerId)
        {
            string cosmosId = InstanceIdToCosmosId(instanceId);
            Uri uri = UriFactory.CreateDocumentUri(databaseId, instanceCollectionId, cosmosId);

            try
            {
                Instance instance = await _client
                .ReadDocumentAsync<Instance>(
                    uri,
                    new RequestOptions { PartitionKey = new PartitionKey(instanceOwnerId.ToString()) });

                PostProcess(instance);

                return instance;
            }
            catch (DocumentClientException ex)
            {
                logger.LogError(ex.Message);
                return null;
            }
            catch (Exception ex)
            {
                logger.LogError(ex.Message);
                throw;
            }
        }

        /// <inheritdoc/>
        public Task<Application> GetApplication(string app, string org)
        {
            if (string.IsNullOrWhiteSpace(org))
            {
                throw new ArgumentNullException(nameof(org));
            }

            return GetApplicationInternal(app, org);
        }

        private async Task<Application> GetApplicationInternal(string app, string org)
        {
            string cosmosAppId = AppIdToCosmosId(app);
            Uri uri = UriFactory.CreateDocumentUri(databaseId, applicationCollectionId, cosmosAppId);

            try
            {
                Application application = await _client
                .ReadDocumentAsync<Application>(
                    uri,
                    new RequestOptions { PartitionKey = new PartitionKey(org) });
                PostProcess(application);

                return application;
            }
            catch (DocumentClientException ex)
            {
                logger.LogError(ex.Message);
                return null;
            }
            catch (Exception ex)
            {
                logger.LogError(ex.Message);
                throw;
            }
        }

        /// <summary>
        /// postprocess applications so that appId becomes org/app-23 to use outside cosmos
        /// </summary>
        /// <param name="application">the application to postprocess</param>
        private void PostProcess(Application application)
        {
            application.Id = CosmosIdToAppId(application.Id);
        }

        /// <summary>
        /// Converts the instanceId (id) of the instance from {instanceGuid} to {instanceOwnerId}/{instanceGuid} to be used outside cosmos.
        /// </summary>
        /// <param name="instance">the instance to preprocess</param>
        private void PostProcess(Instance instance)
        {
            instance.Id = $"{instance.InstanceOwner.PartyId}/{instance.Id}";
        }

        /// <summary>
        /// Converts the appId "{org}/{app}" to "{org}-{app}"
        /// </summary>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>the converted id</returns>
        private string AppIdToCosmosId(string app)
        {
            string cosmosId = app;

            if (app != null && app.Contains("/"))
            {
                string[] parts = app.Split("/");

                cosmosId = $"{parts[0]}-{parts[1]}";
            }

            return cosmosId;
        }

        /// <summary>
        /// Converts the cosmosId "{org}-{app}" to "{org}/{app}"
        /// </summary>
        /// <param name="cosmosId">the id to convert</param>
        /// <returns>the converted id</returns>
        private string CosmosIdToAppId(string cosmosId)
        {
            string appId = cosmosId;

            int firstDash = cosmosId.IndexOf("-");

            if (firstDash > 0)
            {
                string app = cosmosId.Substring(firstDash + 1);
                string org = cosmosId.Split("-")[0];

                appId = $"{org}/{app}";
            }

            return appId;
        }

        /// <summary>
        /// An instanceId should follow this format {int}/{guid}.
        /// Cosmos does not allow / in id.
        /// But in some old cases instanceId is just {guid}.
        /// </summary>
        /// <param name="instanceId">the id to convert to cosmos</param>
        /// <returns>the guid of the instance</returns>
        private string InstanceIdToCosmosId(string instanceId)
        {
            string cosmosId = instanceId;

            if (instanceId != null && instanceId.Contains("/"))
            {
                cosmosId = instanceId.Split("/")[1];
            }

            return cosmosId;
        }

        /// <summary>
        /// An instanceId should follow this format {int}/{guid}.
        /// Cosmos does not allow / in id.
        /// But in some old cases instanceId is just {guid}.
        /// </summary>
        /// <param name="instanceId">the id to convert to cosmos</param>
        /// <returns>the guid of the instance</returns>
        private int GetInstanceOwnerIdFromInstanceId(string instanceId)
        {
            string instanceOwnerId = string.Empty;

            if (instanceId != null && instanceId.Contains("/"))
            {
                instanceOwnerId = instanceId.Split("/")[0];
            }

            return Convert.ToInt32(instanceOwnerId);
        }
    }
}
