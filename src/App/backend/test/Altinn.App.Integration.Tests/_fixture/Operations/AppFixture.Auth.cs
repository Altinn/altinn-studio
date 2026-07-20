using System.IdentityModel.Tokens.Jwt;
using System.Net.Http.Headers;

namespace Altinn.App.Integration.Tests;

public partial class AppFixture : IAsyncDisposable
{
    private AuthOperations? _auth;
    internal AuthOperations Auth
    {
        get
        {
            if (_auth == null)
            {
                _auth = new AuthOperations(this);
            }
            return _auth;
        }
    }

    internal sealed class AuthOperations(AppFixture fixture)
    {
        private readonly AppFixture _fixture = fixture;

        /// <summary>
        /// Waits until a freshly minted token's <c>nbf</c> has passed on this machine's clock.
        /// LocalTest mints tokens on its container clock while the process-mode app validates on
        /// the host clock with zero skew, so Docker VM clock drift can make a brand-new token
        /// momentarily invalid. LocalTest backdates <c>nbf</c> to compensate; this wait is the
        /// test-side safety net in case drift ever exceeds that tolerance.
        /// </summary>
        private static async Task<string> WaitUntilTokenValid(string token)
        {
            var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);
            TimeSpan delay = jwt.ValidFrom - DateTime.UtcNow;
            if (delay > TimeSpan.Zero)
            {
                await Task.Delay(delay + TimeSpan.FromMilliseconds(100));
            }

            return token;
        }

        public async Task<string> GetOldUserToken(int userId = 1337)
        {
            var client = _fixture.GetLocaltestClient();
            using var response = await client.GetAsync($"/Home/GetTestUserToken/{userId}");
            Assert.True(response.IsSuccessStatusCode, $"Failed to get token for user {userId}");
            var token = await response.Content.ReadAsStringAsync();
            Assert.NotNull(token);
            Assert.NotEmpty(token);
            return await WaitUntilTokenValid(token);
        }

        public async Task<string> GetOldServiceOwnerToken(
            string scopes = "altinn:serviceowner/instances.write altinn:serviceowner/instances.read"
        )
        {
            var client = _fixture.GetLocaltestClient();
            var encodedScopes = Uri.EscapeDataString(scopes);
            using var response = await client.GetAsync(
                $"/Home/GetTestOrgToken/ttd?orgNumber=405003309&scopes={encodedScopes}"
            );
            Assert.True(response.IsSuccessStatusCode, "Failed to get service owner token");
            var token = await response.Content.ReadAsStringAsync();
            Assert.NotNull(token);
            Assert.NotEmpty(token);
            return await WaitUntilTokenValid(token);
        }

        public async Task<string> GetUserToken(
            int userId = 1337,
            int? partyId = null,
            int authenticationLevel = 2,
            string? scope = null
        )
        {
            var client = _fixture.GetLocaltestClient();
            var queryParams = new List<string> { $"userId={userId}" };
            if (partyId.HasValue)
                queryParams.Add($"partyId={partyId}");
            if (authenticationLevel != 2)
                queryParams.Add($"authenticationLevel={authenticationLevel}");
            if (!string.IsNullOrEmpty(scope))
                queryParams.Add($"scope={Uri.EscapeDataString(scope)}");

            var queryString = queryParams.Count > 0 ? "?" + string.Join("&", queryParams) : "";
            using var response = await client.GetAsync($"/Home/auth/user{queryString}");
            Assert.True(response.IsSuccessStatusCode, $"Failed to get user token");
            var token = await response.Content.ReadAsStringAsync();
            Assert.NotNull(token);
            Assert.NotEmpty(token);
            return await WaitUntilTokenValid(token);
        }

        public async Task<string> GetServiceOwnerToken(string? scope = null)
        {
            var client = _fixture.GetLocaltestClient();

            // Hardcoded from default localtest testdata
            var queryParams = new List<string> { "org=ttd", "orgNumber=405003309" };
            if (!string.IsNullOrEmpty(scope))
                queryParams.Add($"scope={Uri.EscapeDataString(scope)}");

            var queryString = queryParams.Count > 0 ? "?" + string.Join("&", queryParams) : "";
            using var response = await client.GetAsync($"/Home/auth/serviceowner{queryString}");
            Assert.True(response.IsSuccessStatusCode, "Failed to get service owner token");
            var token = await response.Content.ReadAsStringAsync();
            Assert.NotNull(token);
            Assert.NotEmpty(token);
            return await WaitUntilTokenValid(token);
        }

        public async Task<string> GetOrgToken(string? orgNumber = null, string? scope = null)
        {
            var client = _fixture.GetLocaltestClient();
            var queryParams = new List<string>();

            if (!string.IsNullOrEmpty(orgNumber))
                queryParams.Add($"orgNumber={orgNumber}");
            if (!string.IsNullOrEmpty(scope))
                queryParams.Add($"scope={Uri.EscapeDataString(scope)}");

            var queryString = queryParams.Count > 0 ? "?" + string.Join("&", queryParams) : "";
            using var response = await client.GetAsync($"/Home/auth/org{queryString}");
            Assert.True(response.IsSuccessStatusCode, "Failed to get org token");
            var token = await response.Content.ReadAsStringAsync();
            Assert.NotNull(token);
            Assert.NotEmpty(token);
            return await WaitUntilTokenValid(token);
        }

        public async Task<string> GetSystemUserToken(
            string? systemId = null,
            string? systemUserId = null,
            string? scope = null
        )
        {
            var client = _fixture.GetLocaltestClient();
            var queryParams = new List<string>();

            if (!string.IsNullOrEmpty(systemId))
                queryParams.Add($"systemId={systemId}");
            if (!string.IsNullOrEmpty(systemUserId))
                queryParams.Add($"systemUserId={systemUserId}");
            if (!string.IsNullOrEmpty(scope))
                queryParams.Add($"scope={Uri.EscapeDataString(scope)}");

            var queryString = queryParams.Count > 0 ? "?" + string.Join("&", queryParams) : "";
            using var response = await client.GetAsync($"/Home/auth/systemuser{queryString}");
            Assert.True(response.IsSuccessStatusCode, "Failed to get system user token");
            var token = await response.Content.ReadAsStringAsync();
            Assert.NotNull(token);
            Assert.NotEmpty(token);
            return await WaitUntilTokenValid(token);
        }

        public async Task<string> GetSelfIdentifiedUserToken(string? username = null, string? scope = null)
        {
            var client = _fixture.GetLocaltestClient();
            var queryParams = new List<string>();

            if (!string.IsNullOrEmpty(username))
                queryParams.Add($"username={username}");
            if (!string.IsNullOrEmpty(scope))
                queryParams.Add($"scope={Uri.EscapeDataString(scope)}");

            var queryString = queryParams.Count > 0 ? "?" + string.Join("&", queryParams) : "";
            using var response = await client.GetAsync($"/Home/auth/selfidentifieduser{queryString}");
            Assert.True(response.IsSuccessStatusCode, "Failed to get self-identified user token");
            var token = await response.Content.ReadAsStringAsync();
            Assert.NotNull(token);
            Assert.NotEmpty(token);
            return await WaitUntilTokenValid(token);
        }

        public async Task<(bool, string)> IntrospectAuthentication(string token)
        {
            var client = _fixture.GetAppClient();
            using var request = new HttpRequestMessage(
                HttpMethod.Get,
                $"{_fixture.AppPath}/api/testing/authentication/introspection"
            );
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            using var response = await client.SendAsync(request);
            var content = await response.Content.ReadAsStringAsync();
            return (response.IsSuccessStatusCode, content);
        }
    }
}
