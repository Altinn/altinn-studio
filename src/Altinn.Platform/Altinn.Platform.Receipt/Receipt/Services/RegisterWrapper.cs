using System.Net.Http;
using System.Threading.Tasks;

using Altinn.Platform.Receipt.Clients;
using Altinn.Platform.Receipt.Helpers;
using Altinn.Platform.Receipt.Services.Interfaces;
using Altinn.Platform.Register.Models;
using AltinnCore.Authentication.Utils;

using Microsoft.AspNetCore.Http;

namespace Altinn.Platform.Receipt.Services
{
    /// <summary>
    /// Wrapper for Altinn Platform Register services.
    /// </summary>
    public class RegisterWrapper : IRegister
    {
        private readonly HttpClient _client;
        private readonly IHttpContextAccessor _contextaccessor;

        /// <summary>
        /// Initializes a new instance of the <see cref="RegisterWrapper"/> class
        /// </summary>
        public RegisterWrapper(IHttpClientAccessor httpClientAccessor, IHttpContextAccessor httpContextAccessor)
        {
            _client = httpClientAccessor.RegisterClient;
            _contextaccessor = httpContextAccessor;
        }

        /// <inheritdoc/>
        public async Task<Party> GetParty(int partyId)
        {
            string token = JwtTokenUtil.GetTokenFromContext(_contextaccessor.HttpContext, "AltinnStudioRuntime");
            JwtTokenUtil.AddTokenToRequestHeader(_client, token);
            string url = $"parties/{partyId}";

            HttpResponseMessage response = await _client.GetAsync(url);

            if (response.StatusCode == System.Net.HttpStatusCode.OK)
            {
                Party party = await response.Content.ReadAsAsync<Party>();
                return party;
            }

            throw new PlatformHttpException(response);
        }
    }
}
