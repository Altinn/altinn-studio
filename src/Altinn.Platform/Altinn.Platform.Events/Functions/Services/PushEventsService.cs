using System;
using System.Net;
using System.Net.Http;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Common.AccessTokenClient.Services;
using Altinn.Platform.Events.Functions.Configuration;
using Altinn.Platform.Events.Functions.Extensions;
using Altinn.Platform.Events.Functions.Models;
using Altinn.Platform.Events.Functions.Services.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Altinn.Platform.Events.Functions.Services
{
    /// <summary>
    /// Handles PushEvents service
    /// </summary>
    public class PushEventsService : IPushEventsService
    {
        private readonly HttpClient _client;
        private readonly IAccessTokenGenerator _accessTokenGenerator;
        private readonly IKeyVaultService _keyVaultService;
        private readonly KeyVaultSettings _keyVaultSettings;
        private readonly PlatformSettings _platformSettings;
        private readonly ILogger<IPushEventsService> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="PushEventsService"/> class.
        /// </summary>
        public PushEventsService(
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
        public async Task SendToPushController(CloudEvent item)
        {
            StringContent httpContent = new StringContent(JsonSerializer.Serialize(item), Encoding.UTF8, "application/json");
            try
            {
                string endpointUrl = "push";

                SecurityTokenDescriptor tokenDescriptor = new SecurityTokenDescriptor();
                _logger.LogInformation($"// KeyVaultURI: {_keyVaultSettings.KeyVaultURI}, platformCertId: {_keyVaultSettings.PlatformCertSecretId}");
                string certBase64 = await _keyVaultService.GetCertificateAsync(_keyVaultSettings.KeyVaultURI, _keyVaultSettings.PlatformCertSecretId);
                if (string.IsNullOrEmpty(certBase64))
                {
                    _logger.LogInformation("// Certificate is empty");
                }
                else
                {
                    _logger.LogInformation($"// certBase64.length: {certBase64.Length}");
                }

                string accessToken = _accessTokenGenerator.GenerateAccessToken(
                    "platform",
                    "events",
                    new X509Certificate2(Convert.FromBase64String(certBase64), (string)null, X509KeyStorageFlags.MachineKeySet | X509KeyStorageFlags.PersistKeySet | X509KeyStorageFlags.Exportable));
                HttpResponseMessage response = await _client.PostAsync(endpointUrl, httpContent, accessToken);
                if (response.StatusCode != HttpStatusCode.OK)
                {
                    _logger.LogError($"// Push event with id {item.Id} failed with statuscode {response.StatusCode}");
                    throw new Exception($"// Push event with id {item.Id} failed with statuscode {response.StatusCode}");
                }
            }
            catch (Exception e)
            {
                _logger.LogError(e, $"// Push event with id {item.Id} failed with errormessage {e.Message}");
                throw e;
            }
        }
    }
}
