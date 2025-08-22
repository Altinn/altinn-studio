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

        public async Task<string> GetUserToken(int userId = 1337)
        {
            var client = _fixture.GetLocaltestClient();
            var response = await client.GetAsync($"/Home/GetTestUserToken/{userId}");
            Assert.True(response.IsSuccessStatusCode, $"Failed to get token for user {userId}");
            var token = await response.Content.ReadAsStringAsync();
            Assert.NotNull(token);
            Assert.NotEmpty(token);
            return token;
        }

        public async Task<string> GetServiceOwnerToken(
            string scopes = "altinn:serviceowner/instances.write altinn:serviceowner/instances.read"
        )
        {
            var client = _fixture.GetLocaltestClient();
            var encodedScopes = Uri.EscapeDataString(scopes);
            var response = await client.GetAsync(
                $"/Home/GetTestOrgToken/ttd?orgNumber=405003309&scopes={encodedScopes}"
            );
            Assert.True(response.IsSuccessStatusCode, "Failed to get service owner token");
            var token = await response.Content.ReadAsStringAsync();
            Assert.NotNull(token);
            Assert.NotEmpty(token);
            return token;
        }
    }
}
