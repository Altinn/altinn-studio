using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Platform.Authorization.Configuration;
using Altinn.Platform.Authorization.Models;
using Altinn.Platform.Authorization.Models.DelegationChangeEvent;
using Altinn.Platform.Authorization.Services.Interface;
using Azure.Storage;
using Azure.Storage.Queues;
using Azure.Storage.Queues.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Authorization.Services.Implementation
{
    /// <inheritdoc />
    public class DelegationChangeEventQueue : IDelegationChangeEventQueue
    {
        private readonly AzureStorageConfiguration _storageConfig;

        /// <summary>
        /// Initializes a new instance of the <see cref="DelegationChangeEventQueue"/> class.
        /// </summary>
        /// <param name="storageConfig">Azure storage queue config</param>
        public DelegationChangeEventQueue(IOptions<AzureStorageConfiguration> storageConfig)
        {
            _storageConfig = storageConfig.Value;
        }

        /// <summary>
        /// Converts the delegation change to a delegation change event and pushes it to the event queue.
        /// Throws exception if something fails
        /// </summary>
        /// <param name="delegationChange">The delegation change stored in postgresql</param>
        public async Task<SendReceipt> Push(DelegationChange delegationChange)
        {
            DelegationChangeEventList dceList = new DelegationChangeEventList
            {
                DelegationChangeEvents = new List<DelegationChangeEvent>
                {
                    new DelegationChangeEvent
                    {
                        EventType = (DelegationChangeEventType)delegationChange.DelegationChangeType,
                        DelegationChange = new SimpleDelegationChange
                        {
                            PolicyChangeId = delegationChange.DelegationChangeId,
                            AltinnAppId = delegationChange.AltinnAppId,
                            OfferedByPartyId = delegationChange.OfferedByPartyId,
                            CoveredByPartyId = delegationChange.CoveredByPartyId,
                            CoveredByUserId = delegationChange.CoveredByUserId,
                            PerformedByUserId = delegationChange.PerformedByUserId,
                            Created = delegationChange.Created
                        }
                    }
                }
            };

            StorageSharedKeyCredential queueCredentials = new StorageSharedKeyCredential(_storageConfig.DelegationEventQueueAccountName, _storageConfig.DelegationEventQueueAccountKey);
            QueueClient queueClient = new QueueClient(new Uri($"{_storageConfig.DelegationEventQueueEndpoint}/delegationevents"), queueCredentials, new QueueClientOptions { MessageEncoding = QueueMessageEncoding.Base64 });
            return await queueClient.SendMessageAsync(JsonSerializer.Serialize(dceList));
        }
    }
}
