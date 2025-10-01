namespace Altinn.App.Integration.Tests;

public partial class AppFixture : IAsyncDisposable
{
    private HostedServicesOperations? _hostedServices;
    internal HostedServicesOperations HostedServices
    {
        get
        {
            _hostedServices ??= new HostedServicesOperations(this);
            return _hostedServices;
        }
    }

    internal sealed class HostedServicesOperations(AppFixture fixture)
    {
        private readonly AppFixture _fixture = fixture;

        public async Task<string> Get()
        {
            var client = _fixture.GetAppClient();
            var endpoint = $"/ttd/{_fixture._app}/api/testing/hostedservices";
            using var request = new HttpRequestMessage(HttpMethod.Get, endpoint);
            using var response = await client.SendAsync(request);
            Assert.True(response.IsSuccessStatusCode, "Failed to get hosted services");
            var content = await response.Content.ReadAsStringAsync();
            return content;
        }
    }
}
