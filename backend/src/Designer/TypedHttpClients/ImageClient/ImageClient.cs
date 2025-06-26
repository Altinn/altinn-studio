using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;

namespace Altinn.Studio.Designer.TypedHttpClients.ImageClient;

public class ImageClient
{
    private readonly HttpClient _httpClient;

    public ImageClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<ImageUrlValidationResult> ValidateRequestResponseAsync(string url)
    {
        using var request = new HttpRequestMessage(HttpMethod.Head, url);
        var response = await _httpClient.SendAsync(request, cancellationToken: default);

        if (!response.IsSuccessStatusCode || !IsImageContentType(response))
        {
            return ImageUrlValidationResult.NotValidImage;
        }

        return ImageUrlValidationResult.Ok;
    }

    private static bool IsImageContentType(HttpResponseMessage response)
    {
        string contentType = response.Content.Headers.ContentType?.MediaType;
        return !string.IsNullOrEmpty(contentType) && contentType.StartsWith("image/");
    }
}
