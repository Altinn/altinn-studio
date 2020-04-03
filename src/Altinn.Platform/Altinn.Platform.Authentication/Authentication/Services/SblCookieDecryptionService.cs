using System;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Runtime.Serialization.Json;
using System.Text;
using System.Threading.Tasks;

using Altinn.Platform.Authentication.Configuration;
using Altinn.Platform.Authentication.Model;
using Altinn.Platform.Authentication.Services.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

using Newtonsoft.Json;

namespace Altinn.Platform.Authentication.Services
{
    /// <summary>
    /// Represents a service that can decrypt an SBL .ASPXAUTH cookie.
    /// </summary>
    public class SblCookieDecryptionService : ISblCookieDecryptionService
    {
        private readonly ILogger<SblCookieDecryptionService> _logger;
        private readonly GeneralSettings _generalSettings;

        private readonly HttpClient _client;

        /// <summary>
        /// Initialize a new instance of <see cref="SblCookieDecryptionService"/>  with settings for SBL Bridge endpoints.
        /// </summary>
        /// <param name="httpClient">Http client from clientfactory</param>
        /// <param name="generalSettings">General settings for the authentication application</param>
        /// <param name="logger">A generic logger</param>
        public SblCookieDecryptionService(HttpClient httpClient, IOptions<GeneralSettings> generalSettings, ILogger<SblCookieDecryptionService> logger)
        {
            _client = httpClient;
            _logger = logger;
            _generalSettings = generalSettings.Value;
        }

        /// <inheritdoc />
        public async Task<UserAuthenticationModel> DecryptTicket(string encryptedTicket)
        {
            DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(UserAuthenticationModel));
            Uri endpointUrl = new Uri($"{_generalSettings.BridgeAuthnApiEndpoint}tickets");

            _logger.LogInformation($"Authentication - Before getting userdata");

            string userData = JsonConvert.SerializeObject(new UserAuthenticationModel { EncryptedTicket = encryptedTicket });

            _logger.LogInformation($"Authentication - endpoint {endpointUrl}");

            HttpResponseMessage response =
                await _client.PostAsync(endpointUrl, new StringContent(userData, Encoding.UTF8, "application/json"));

            _logger.LogInformation($"Authentication - response {response.StatusCode}");

            if (response.StatusCode == HttpStatusCode.OK)
            {
                Stream stream = await response.Content.ReadAsStreamAsync();
                UserAuthenticationModel userAuthentication = serializer.ReadObject(stream) as UserAuthenticationModel;

                return userAuthentication;
            }

            // If user is not authenticated redirect to login
            _logger.LogInformation($"UserNotAuthenticated");
            _logger.LogError($"Getting the authenticated user failed with statuscode {response.StatusCode}");

            return null;
        }
    }
}
