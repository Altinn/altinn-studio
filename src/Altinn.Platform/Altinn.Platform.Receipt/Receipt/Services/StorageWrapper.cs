using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;

using Altinn.Platform.Receipt.Clients;
using Altinn.Platform.Receipt.Configuration;
using Altinn.Platform.Receipt.Extensions;
using Altinn.Platform.Receipt.Helpers;
using Altinn.Platform.Storage.Interface.Models;
using AltinnCore.Authentication.Utils;

using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Receipt.Services.Interfaces
{
    /// <summary>
    /// Wrapper for Altinn Platform Storage services
    /// </summary>
    public class StorageWrapper : IStorage
    {
        private readonly HttpClient _client;
        private readonly IHttpContextAccessor _contextAccessor;
        private readonly PlatformSettings _platformSettings;

        /// <summary>
        /// Initializes a new instance of the <see cref="StorageWrapper"/> class
        /// </summary>
        public StorageWrapper(HttpClient httpClient, IHttpContextAccessor httpContextAccessor, IOptions<PlatformSettings> platformSettings)
        {
            _platformSettings = platformSettings.Value;
            httpClient.BaseAddress = new Uri(_platformSettings.ApiRegisterEndpoint);
            httpClient.DefaultRequestHeaders.Add(_platformSettings.SubscriptionKeyHeaderName, _platformSettings.SubscriptionKey);
            httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            _client = httpClient;
            _contextAccessor = httpContextAccessor;
        }

        /// <inheritdoc/>
        public async Task<Instance> GetInstance(int instanceOwnerId, Guid instanceGuid)
        {
            string token = JwtTokenUtil.GetTokenFromContext(_contextAccessor.HttpContext, "AltinnStudioRuntime");

            string url = $"instances/{instanceOwnerId}/{instanceGuid}";

            HttpResponseMessage response = await _client.GetAsync(token, url);

            if (response.StatusCode == System.Net.HttpStatusCode.OK)
            {
                Instance instance = await response.Content.ReadAsAsync<Instance>();
                return instance;
            }

            throw new PlatformHttpException(response, string.Empty);
        }
    }
}
