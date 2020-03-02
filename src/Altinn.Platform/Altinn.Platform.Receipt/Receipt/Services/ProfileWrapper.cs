using System.Net.Http;
using System.Threading.Tasks;

using Altinn.Platform.Profile.Models;
using Altinn.Platform.Receipt.Clients;
using Altinn.Platform.Receipt.Helpers;
using AltinnCore.Authentication.Utils;
using Microsoft.AspNetCore.Http;

namespace Altinn.Platform.Receipt.Services.Interfaces
{
    /// <summary>
    /// Wrapper for Altinn Platform Profile services
    /// </summary>
    public class ProfileWrapper : IProfile
    {
        private readonly HttpClient _client;
        private readonly HttpContext _context;

        /// <summary>
        /// Initializes a new instance of the <see cref="ProfileWrapper"/> class
        /// </summary>
        public ProfileWrapper(IHttpClientAccessor httpClientAccessor, IHttpContextAccessor httpContextAccessor)
        {
            _client = httpClientAccessor.ProfileClient;
            _context = httpContextAccessor.HttpContext;
        }

        /// <inheritdoc/>
        public async Task<UserProfile> GetUser(int userId)
        {
            string token = JwtTokenUtil.GetTokenFromContext(_context, "AltinnStudioRuntime");
            JwtTokenUtil.AddTokenToRequestHeader(_client, token);
            string url = $"users/{userId}";

            HttpResponseMessage response = await _client.GetAsync(url);

            if (response.StatusCode == System.Net.HttpStatusCode.OK)
            {
                UserProfile profile = await response.Content.ReadAsAsync<UserProfile>();
                return profile;
            }

            throw new PlatformHttpException(response);
        }
    }
}
