using System.Net.Http.Headers;

namespace Altinn.App.Integration.Tests;

public partial class AppFixture : IAsyncDisposable
{
    private GenericOperations? _genericOperations;
    internal GenericOperations Generic
    {
        get
        {
            if (_genericOperations == null)
            {
                _genericOperations = new GenericOperations(this);
            }
            return _genericOperations;
        }
    }

    internal sealed class GenericOperations(AppFixture fixture)
    {
        private readonly AppFixture _fixture = fixture;

        public async Task<ApiResponse> Get(string endpoint, string token)
        {
            var client = _fixture.GetAppClient();
            using var request = new HttpRequestMessage(HttpMethod.Get, endpoint);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            var response = await client.SendAsync(request);
            return new ApiResponse(_fixture, response);
        }

        public async Task<ApiResponse> Post(string endpoint, string token, HttpContent content)
        {
            var client = _fixture.GetAppClient();
            using var request = new HttpRequestMessage(HttpMethod.Post, endpoint);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            request.Content = content;
            var response = await client.SendAsync(request);
            return new ApiResponse(_fixture, response);
        }
    }
}
