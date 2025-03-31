using System;
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

    public async Task<ImageUrlValidationResult> ValidateUrlAsync(string url)
    {
        try
        {
            // Send a HEAD request to the URL to check if the resource exists and fetch the headers
            using var request = new HttpRequestMessage(HttpMethod.Head, url);
            var response = await _httpClient.SendAsync(request, cancellationToken: default);

            System.Console.WriteLine(response.StatusCode);
            // If the response status is not successful return NotValidUrl
            if (!response.IsSuccessStatusCode)
            {
                return ImageUrlValidationResult.NotValidUrl;
            }
            var contentType = response.Content.Headers.ContentType.MediaType;
            if (!contentType.StartsWith("image/"))
            {
                // If the response did not return an image in its content return NotAnImage
                return ImageUrlValidationResult.NotAnImage;
            }

            return ImageUrlValidationResult.Ok;
        }
        // If the request fails for some other reason return NotValidUrl
        catch (Exception ex)
            when (ex is UriFormatException or InvalidOperationException or HttpRequestException)
        {
            return ImageUrlValidationResult.NotValidUrl;
        }
    }
}
