#nullable enable

using System;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

using Altinn.App.PlatformServices.Helpers;
using Altinn.App.PlatformServices.Interface;
using Altinn.App.Services;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Constants;
using Altinn.App.Services.Interface;
using Altinn.Common.AccessTokenClient.Services;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;

using Microsoft.Extensions.Options;

namespace Altinn.App.PlatformServices.Implementation
{
    /// <summary>
    /// Represents an implementation of <see cref="IPersonRetriever"/> that will call the Register
    /// component to retrieve person information.
    /// </summary>
    public class PersonClient : IPersonRetriever
    {
        private readonly HttpClient _httpClient;
        private readonly IAppResources _appResources;
        private readonly IAccessTokenGenerator _accessTokenGenerator;
        private readonly IUserTokenProvider _userTokenProvider;

        private readonly JsonSerializerOptions _jsonSerializerOptions = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            PropertyNameCaseInsensitive = true
        };

        /// <summary>
        /// Initializes a new instance of the <see cref="PersonClient"/> class.
        /// </summary>
        /// <param name="httpClient">The HttpClient to be used to send requests to Register.</param>
        /// <param name="platformSettings">The platform settings from loaded configuration.</param>
        /// <param name="appResources">A service with access to app specific information.</param>
        /// <param name="accessTokenGenerator">An access token generator to create an access token.</param>
        /// <param name="userTokenProvider">A service that can obtain the user JWT token.</param>
        public PersonClient(
            HttpClient httpClient, 
            IOptions<PlatformSettings> platformSettings,
            IAppResources appResources,
            IAccessTokenGenerator accessTokenGenerator,
            IUserTokenProvider userTokenProvider)
        {
            _httpClient = httpClient;
            _httpClient.BaseAddress = new Uri(platformSettings.Value.ApiRegisterEndpoint);
            _httpClient.DefaultRequestHeaders.Add(
                General.SubscriptionKeyHeaderName, 
                platformSettings.Value.SubscriptionKey);
            _httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

            _appResources = appResources;
            _accessTokenGenerator = accessTokenGenerator;
            _userTokenProvider = userTokenProvider;
        }

        /// <inheritdoc/>
        public async Task<Person?> GetPerson(string nationalIdentityNumber, string lastName, CancellationToken ct)
        {
            HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Get, $"persons");

            AddAuthHeaders(request);

            request.Headers.Add("X-Ai-NationalIdentityNumber", nationalIdentityNumber);
            request.Headers.Add("X-Ai-LastName", ConvertToBase64(lastName));

            var response = await _httpClient.SendAsync(request, HttpCompletionOption.ResponseContentRead, ct);

            return await ReadResponse(response, ct);
        }

        private void AddAuthHeaders(HttpRequestMessage request)
        {
            Application application = _appResources.GetApplication();
            string issuer = application.Org;
            string appName = application.Id.Split("/")[1];
            request.Headers.Add(
                "PlatformAccessToken", _accessTokenGenerator.GenerateAccessToken(issuer, appName));
            request.Headers.Add(
                "Authorization", "Bearer " + _userTokenProvider.GetUserToken());
        }

        private async Task<Person?> ReadResponse(HttpResponseMessage response, CancellationToken ct)
        {
            if (response.StatusCode == HttpStatusCode.OK)
            {
                return await response.Content.ReadFromJsonAsync<Person>(_jsonSerializerOptions, ct);
            }

            if (response.StatusCode == HttpStatusCode.NotFound)
            {
                return null;
            }

            throw await PlatformHttpException.CreateAsync(response);
        }

        private static string ConvertToBase64(string text)
        {
            var bytes = Encoding.UTF8.GetBytes(text);
            return Convert.ToBase64String(bytes);
        }
    }
}
