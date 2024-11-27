using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace Altinn.Studio.Designer.TypedHttpClients.Slack;

public class SlackClient : ISlackClient
{
    private readonly HttpClient _httpClient;
    private readonly JsonSerializerOptions _jsonSerializerOptions = new JsonSerializerOptions
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public SlackClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task SendMessage(SlackRequest request, CancellationToken cancellationToken = default)
    {
        using var payloadContent = new StringContent(JsonSerializer.Serialize(request, _jsonSerializerOptions),
            Encoding.UTF8,
            MediaTypeNames.Application.Json);

        using var response = await _httpClient.PostAsync(string.Empty, payloadContent, cancellationToken);
        response.EnsureSuccessStatusCode();
    }
}
