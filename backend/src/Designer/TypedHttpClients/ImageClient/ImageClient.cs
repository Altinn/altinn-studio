using System;
using System.Net.Http;
using System.Threading.Tasks;

namespace Altinn.Studio.Designer.TypedHttpClients.ImageClient;

public class ImageClient
{
    private readonly HttpClient _httpClient;

    public ImageClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<HttpResponseMessage> ValidateUrlAsync(string url)
    {
        try
        {
            // Send a HEAD request to the URL to check if the resource exists and fetch the headers
            using var request = new HttpRequestMessage(HttpMethod.Head, url);
            var response = await _httpClient.SendAsync(request);

            // If the response status is not successful, return null
            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            return response;
        }
        catch (UriFormatException)
        {
            return null;
        }
        catch (InvalidOperationException)
        {
            return null;
        }
        catch (HttpRequestException)
        {
            return null;
        }
    }
}
