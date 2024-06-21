using System.Net.Http;
using System.Threading.Tasks;

namespace Altinn.Studio.Designer.TypedHttpClients.EidLogger;

public class EidLoggerClient : IEidLoggerClient
{
    private readonly HttpClient _httpClient;

    public EidLoggerClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task Log(EidLogRequest request)
    {
        var response = await _httpClient.PostAsJsonAsync("eid-event-log", request);
        response.EnsureSuccessStatusCode();
    }
}
