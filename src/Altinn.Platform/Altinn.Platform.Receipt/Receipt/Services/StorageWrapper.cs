using System;
using System.Net.Http;
using System.Threading.Tasks;

using Altinn.Platform.Receipt.Clients;
using Altinn.Platform.Receipt.Helpers;
using Altinn.Platform.Storage.Interface.Models;
using AltinnCore.Authentication.Utils;

using Microsoft.AspNetCore.Http;

namespace Altinn.Platform.Receipt.Services.Interfaces
{
    /// <summary>
    /// Wrapper for Altinn Platform Storage services
    /// </summary>
    public class StorageWrapper : IStorage
    {
        private readonly HttpClient _client;
        private readonly IHttpContextAccessor _contextAccessor;

        /// <summary>
        /// Initializes a new instance of the <see cref="StorageWrapper"/> class
        /// </summary>
        public StorageWrapper(IHttpClientAccessor httpClientAccessor, IHttpContextAccessor httpContextAccessor)
        {
            _client = httpClientAccessor.StorageClient;
            _contextAccessor = httpContextAccessor;
        }

        /// <inheritdoc/>
        public async Task<Instance> GetInstance(int instanceOwnerId, Guid instanceGuid)
        {
            string token = JwtTokenUtil.GetTokenFromContext(_contextAccessor.HttpContext, "AltinnStudioRuntime");
            JwtTokenUtil.AddTokenToRequestHeader(_client, token);

            string url = $"instances/{instanceOwnerId}/{instanceGuid}";

            HttpResponseMessage response = await _client.GetAsync(url);

            if (response.StatusCode == System.Net.HttpStatusCode.OK)
            {
                Instance instance = await response.Content.ReadAsAsync<Instance>();
                return instance;
            }

            throw new PlatformHttpException(response);
        }
    }
}
