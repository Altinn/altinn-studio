using System.Threading.Tasks;
using Altinn.Common.AccessTokenClient.Services;
using Altinn.Platform.Authorization.Functions.Clients;
using Altinn.Platform.Authorization.Functions.Models;
using Altinn.Platform.Authorization.Functions.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace Altinn.Platform.Authorization.Functions.Services
{
    public class EventPusherService : IEventPusherService
    {
        private readonly ILogger _logger;
        private readonly IKeyVaultService _keyVaultService;
        private readonly IAccessTokenGenerator _accessTokenGenerator;
        private readonly BridgeClient _bridgeClient;

        public EventPusherService(ILogger logger, IKeyVaultService keyVaultService, IAccessTokenGenerator accessTokenGenerator,
            BridgeClient bridgeClient)
        {
            _logger = logger;
            _keyVaultService = keyVaultService;
            _accessTokenGenerator = accessTokenGenerator;
            _bridgeClient = bridgeClient;
        }

        public async Task PushEvent(DelegationChangeEvent delegationChangeEvent)
        {
            // TODO!
            // - Get token (and cache it)
            // - Send events to bridge
            // - If the request fails, throw so the queue items will be requeued
            await Task.CompletedTask;
        }
    }
}
