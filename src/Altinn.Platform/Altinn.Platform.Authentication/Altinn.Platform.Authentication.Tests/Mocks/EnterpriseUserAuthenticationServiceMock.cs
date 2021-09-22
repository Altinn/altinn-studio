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
            HttpResponseMessage result = new HttpResponseMessage();
            
            if (credentials.UserName == "Test" && credentials.Password == "Testesen")
            {
                result.StatusCode = HttpStatusCode.TooManyRequests;
                RetryConditionHeaderValue retryAfter = new RetryConditionHeaderValue(DateTime.Now);
                result.Headers.RetryAfter = retryAfter;
            }
            else if (credentials.UserName == "ValidUser" && credentials.Password == "ValidPassword")
            {
                result.StatusCode = HttpStatusCode.OK;
                result.Content = GetEnterpriseUserContent(credentials.UserName);
            }
            else if (credentials.UserName == "ValidUser2" && credentials.Password == "Valid:Password")
            {
                result.StatusCode = HttpStatusCode.OK;
                result.Content = GetEnterpriseUserContent(credentials.UserName);
            }
            else
            {
                result.StatusCode = HttpStatusCode.NotFound;
            }

            return await Task.FromResult(result);
        }

        private static HttpContent GetEnterpriseUserContent(string userName)
        {
            string jsonString = $"{{\r\n\t\"UserID\": 1234,\r\n\t\"Username\": \"{userName}\",\r\n\t\"SSN\": null,\r\n\t\"PartyID\": 0,\r\n\t\"AuthenticateResult\": 1,\r\n\t\"AuthenticationMethod\": 9,\r\n\t\"LockedOutDate\": \"1753-01-01T00:00:00\",\r\n\t\"SmsPinUpgraded\": false,\r\n\t\"IsTestUser\": false,\r\n\t\"IDPortenNameID\": null,\r\n\t\"IDPortenSessionIndex\": null\r\n}}";
            HttpContent content = new StringContent(jsonString, Encoding.UTF8, "application/json");

            return content;
        }
    }
}
