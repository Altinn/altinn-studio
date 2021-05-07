using System;
using System.Net;
using System.Net.Http;
using System.Security.Cryptography.X509Certificates;
using System.Threading.Tasks;
using Altinn.Common.AccessTokenClient.Services;
using Altinn.Platform.Events.Functions.Configuration;
using Altinn.Platform.Events.Functions.Extensions;
using Altinn.Platform.Events.Functions.Services.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Events.Functions.Services
{
    /// <summary>
    /// Service to validate subscription
    /// </summary>
    public class ValidateSubscriptionService : IValidateSubscriptionService
    {
        private readonly HttpClient _client;
        private readonly IAccessTokenGenerator _accessTokenGenerator;
        private readonly IKeyVaultService _keyVaultService;
        private readonly KeyVaultSettings _keyVaultSettings;
        private readonly PlatformSettings _platformSettings;
        private readonly ILogger<IPushEventsService> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="ValidateSubscriptionService"/> class.
        /// </summary>
        public ValidateSubscriptionService(
        HttpClient httpClient,
        IAccessTokenGenerator accessTokenGenerator,
        IKeyVaultService keyVaultService,
        IOptions<PlatformSettings> eventsConfig,
        IOptions<KeyVaultSettings> keyVaultSettings,
        ILogger<IPushEventsService> logger)
        {
            _platformSettings = eventsConfig.Value;
            _keyVaultSettings = keyVaultSettings.Value;
            httpClient.BaseAddress = new Uri(_platformSettings.ApiEventsEndpoint);
            _client = httpClient;
            _accessTokenGenerator = accessTokenGenerator;
            _keyVaultService = keyVaultService;
            _logger = logger;
        }

        /// <inheritdoc/>
        public async Task ValidateSubscription(int subscriptionId)
        {
            try
            {
                string endpointUrl = "subscriptions/validate/" + subscriptionId;
               
                string certBase64 = await _keyVaultService.GetCertificateAsync(_keyVaultSettings.KeyVaultURI, _keyVaultSettings.PlatformCertSecretId);
                string accessToken = _accessTokenGenerator.GenerateAccessToken(
                    "platform",
                    "events",
                    new X509Certificate2(Convert.FromBase64String(certBase64), (string)null, X509KeyStorageFlags.MachineKeySet | X509KeyStorageFlags.PersistKeySet | X509KeyStorageFlags.Exportable));

                HttpResponseMessage response = await _client.PutAsync(endpointUrl, null, accessToken);
                if (response.StatusCode != HttpStatusCode.OK)
                {
                    _logger.LogError($"// Validate subscription with id {subscriptionId} failed with statuscode {response.StatusCode}");
                    throw new Exception($"// Validate subscription with id {subscriptionId} failed with statuscode {response.StatusCode}");
                }
            }
            catch (Exception e)
            {
                _logger.LogError(e, $"// Validate subscription with id {subscriptionId} failed with errormessage {e.Message}");
                throw e;
            }
        }
    }
}
