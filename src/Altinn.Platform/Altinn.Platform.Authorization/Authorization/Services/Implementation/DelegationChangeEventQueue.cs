using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Platform.Authorization.Configuration;
using Altinn.Platform.Authorization.Models;
using Altinn.Platform.Authorization.Models.DelegationChangeEvent;
using Altinn.Platform.Authorization.Services.Interface;
using Azure.Storage;
using Azure.Storage.Queues;
using Azure.Storage.Queues.Models;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Authorization.Services.Implementation
{
    /// <inheritdoc />
    [ExcludeFromCodeCoverage]
    public class DelegationChangeEventQueue : IDelegationChangeEventQueue
    {
        private readonly AzureStorageConfiguration _storageConfig;
        private readonly IEventMapperService _eventMapperService;
        private QueueClient _queueClient;

        /// <summary>
        /// Initializes a new instance of the <see cref="DelegationChangeEventQueue"/> class.
        /// </summary>
        /// <param name="eventMapperService">Mapper service responsible for mapping models</param>
        /// <param name="storageConfig">Azure storage queue config</param>
        public DelegationChangeEventQueue(IEventMapperService eventMapperService, IOptions<AzureStorageConfiguration> storageConfig)
        {
            _eventMapperService = eventMapperService;
            _storageConfig = storageConfig.Value;
        }

        /// <summary>
        /// Converts the delegation change to a delegation change event and pushes it to the event queue.
        /// Throws exception if something fails
        /// </summary>
        /// <param name="delegationChange">The delegation change stored in postgresql</param>
        public async Task<SendReceipt> Push(DelegationChange delegationChange)
        {
            DelegationChangeEventList dceList = _eventMapperService.MapToDelegationChangeEventList(new List<DelegationChange> { delegationChange });
            QueueClient queueClient = await GetQueueClient();
            return await queueClient.SendMessageAsync(JsonSerializer.Serialize(dceList));
        }

        private async Task<QueueClient> GetQueueClient()
        {
            if (_queueClient == null)
            {
                StorageSharedKeyCredential queueCredentials = new StorageSharedKeyCredential(_storageConfig.DelegationEventQueueAccountName, _storageConfig.DelegationEventQueueAccountKey);
                _queueClient = new QueueClient(new Uri($"{_storageConfig.DelegationEventQueueEndpoint}/delegationevents"), queueCredentials, new QueueClientOptions { MessageEncoding = QueueMessageEncoding.Base64 });
                await _queueClient.CreateIfNotExistsAsync();
            }

            return _queueClient;
        }
    }
}
