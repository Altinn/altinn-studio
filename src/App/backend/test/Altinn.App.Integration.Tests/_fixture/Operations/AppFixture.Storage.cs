using System.Net.Http.Headers;
using System.Net.Http.Json;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Integration.Tests;

public partial class AppFixture
{
    private StorageOperations? _storage;
    internal StorageOperations Storage => _storage ??= new StorageOperations(this);

    // Direct Storage operations seed instances created by older app versions, without invoking the current workflow.
    internal sealed class StorageOperations(AppFixture fixture)
    {
        public async Task<ApiResponse> CreateInstance(string token, Instance template)
        {
            using var request = new HttpRequestMessage(
                HttpMethod.Post,
                $"/storage/api/v1/instances?appId={Uri.EscapeDataString(fixture._appId)}"
            );
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            request.Content = JsonContent.Create(template, options: _jsonSerializerOptions);
            return new ApiResponse(fixture, await fixture.GetLocaltestClient().SendAsync(request));
        }

        public async Task<ApiResponse> InsertData(
            string token,
            ReadApiResponse<Instance> instance,
            string dataType,
            string content,
            string contentType = "application/json"
        )
        {
            var model = instance.Data.Model ?? throw new InvalidOperationException("Instance data model is null");
            using var request = new HttpRequestMessage(
                HttpMethod.Post,
                $"/storage/api/v1/instances/{model.Id}/data?dataType={Uri.EscapeDataString(dataType)}"
            );
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            request.Content = new StringContent(content, new MediaTypeHeaderValue(contentType));
            request.Content.Headers.ContentDisposition = new ContentDispositionHeaderValue("attachment")
            {
                FileName = $"{dataType}.json",
            };
            return new ApiResponse(fixture, await fixture.GetLocaltestClient().SendAsync(request));
        }
    }
}
