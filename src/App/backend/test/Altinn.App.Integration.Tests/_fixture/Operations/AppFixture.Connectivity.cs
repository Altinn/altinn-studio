using System.Net.Http.Json;
using TestApp.Shared;

namespace Altinn.App.Integration.Tests;

public partial class AppFixture : IAsyncDisposable
{
    private ConnectivityOperations? _connectivity;
    internal ConnectivityOperations Connectivity
    {
        get
        {
            if (_connectivity == null)
            {
                _connectivity = new ConnectivityOperations(this);
            }
            return _connectivity;
        }
    }

    internal sealed class ConnectivityOperations(AppFixture fixture)
    {
        private readonly AppFixture _fixture = fixture;

        /// <summary>
        /// Tests app-to-PDF connectivity by calling the app's PDF diagnostic endpoint.
        /// </summary>
        public async Task<ConnectivityResult> Pdf()
        {
            var client = _fixture.GetAppClient();
            using var response = await client.GetAsync($"{_fixture.AppPath}/api/testing/connectivity/pdf");
            Assert.True(response.IsSuccessStatusCode, "Failed to check app PDF connectivity");
            var content = await response.Content.ReadFromJsonAsync<ConnectivityResult>();
            return content ?? throw new InvalidOperationException("Failed to deserialize connectivity result");
        }

        /// <summary>
        /// Tests app-to-localtest connectivity by calling the app's localtest diagnostic endpoint.
        /// </summary>
        public async Task<ConnectivityResult> Localtest()
        {
            var client = _fixture.GetAppClient();
            using var response = await client.GetAsync($"{_fixture.AppPath}/api/testing/connectivity/localtest");
            Assert.True(response.IsSuccessStatusCode, "Failed to check app localtest connectivity");
            var content = await response.Content.ReadFromJsonAsync<ConnectivityResult>();
            return content ?? throw new InvalidOperationException("Failed to deserialize connectivity result");
        }
    }
}
