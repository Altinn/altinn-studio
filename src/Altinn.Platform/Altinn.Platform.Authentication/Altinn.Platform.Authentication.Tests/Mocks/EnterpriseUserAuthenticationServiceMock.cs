using System;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Platform.Authentication.Configuration;
using Altinn.Platform.Authentication.Model;
using Altinn.Platform.Authentication.Services.Interfaces;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Authentication.Tests.Mocks
{
    public class EnterpriseUserAuthenticationServiceMock : IEnterpriseUserAuthenticationService
    {
        private readonly GeneralSettings _settings;
        private readonly HttpClient _client;

        /// <summary>
        /// Initialize a new instance of <see cref="EnterpriseUserAuthenticationServiceMock"/> with settings for SBL Bridge endpoints.
        /// </summary>
        /// <param name="httpClient">Httpclient from httpclientfactory</param>
        /// <param name="settings">General settings for the authentication application</param>
        public EnterpriseUserAuthenticationServiceMock(HttpClient httpClient, IOptions<GeneralSettings> settings)
        {
            _client = httpClient;
            _settings = settings.Value;
        }

        public async Task<HttpResponseMessage> AuthenticateEnterpriseUser(EnterpriseUserCredentials credentials)
        {
             if (credentials.UserName == "Test" && credentials.Password == "Testesen")
            {
                string credentialsJson = JsonSerializer.Serialize(credentials);
                var request = new HttpRequestMessage
                {
                    Method = HttpMethod.Post,
                    RequestUri = new Uri(_settings.BridgeAuthnApiEndpoint + "enterpriseuser"),
                    Content = new StringContent(credentialsJson.ToString(), Encoding.UTF8, "application/json")
                };

                var result = await _client.SendAsync(request).ConfigureAwait(false);
                result.StatusCode = HttpStatusCode.TooManyRequests;
                RetryConditionHeaderValue retryAfter = new RetryConditionHeaderValue(DateTime.Now);
                result.Headers.RetryAfter = retryAfter;
                return result;
            }
             else
            {
                string credentialsJson = JsonSerializer.Serialize(credentials);
                var request = new HttpRequestMessage
                {
                    Method = HttpMethod.Post,
                    RequestUri = new Uri(_settings.BridgeAuthnApiEndpoint + "enterpriseuser"),
                    Content = new StringContent(credentialsJson.ToString(), Encoding.UTF8, "application/json")
                };

                var result = await _client.SendAsync(request).ConfigureAwait(false);
                result.StatusCode = HttpStatusCode.NotFound;
                return result;
            }
        }
    }
}
