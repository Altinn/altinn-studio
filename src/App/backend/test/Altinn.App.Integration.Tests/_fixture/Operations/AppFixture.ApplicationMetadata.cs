namespace Altinn.App.Integration.Tests;

public partial class AppFixture : IAsyncDisposable
{
    private ApplicationMetadataOperations? _applicationMetadata;
    internal ApplicationMetadataOperations ApplicationMetadata
    {
        get
        {
            if (_applicationMetadata == null)
            {
                _applicationMetadata = new ApplicationMetadataOperations(this);
            }
            return _applicationMetadata;
        }
    }

    internal sealed class ApplicationMetadataOperations(AppFixture fixture)
    {
        private readonly AppFixture _fixture = fixture;

        public async Task<ApiResponse> Get()
        {
            var client = _fixture.GetAppClient();
            var endpoint = $"/ttd/{_fixture._app}/api/v1/applicationmetadata";
            var response = await client.GetAsync(endpoint);
            return new ApiResponse(_fixture, response);
        }
    }
}
