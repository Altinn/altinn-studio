using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;

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
            using var request = new HttpRequestMessage(HttpMethod.Head, url);
            var response = await _httpClient.SendAsync(request);

            if (!response.IsSuccessStatusCode)
            {
                return ImageUrlValidationResult.NotValidImage;
            }

            string contentType = response.Content.Headers.ContentType?.MediaType;
            if (string.IsNullOrEmpty(contentType) || !contentType.StartsWith("image/"))
            {
                return ImageUrlValidationResult.NotValidImage;
            }

            return ImageUrlValidationResult.Ok;
        }
        catch
        {
            return ImageUrlValidationResult.NotValidImage;
        }
    }
}
