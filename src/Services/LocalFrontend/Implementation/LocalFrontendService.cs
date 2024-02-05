#nullable enable
using LocalTest.Configuration;
using LocalTest.Models;
using LocalTest.Services.LocalFrontend.Interface;
using Microsoft.Extensions.Options;

namespace LocalTest.Services.LocalFrontend;

public class LocalFrontendService: ILocalFrontendService
{
    private readonly HttpClient _httpClient;
    private static readonly Range PortRange = 8080..8090;
    private readonly string _localFrontedBaseUrl;

    public LocalFrontendService(IHttpClientFactory httpClientFactory, IOptions<LocalPlatformSettings> localPlatformSettings)
    {
        _httpClient = httpClientFactory.CreateClient();
        _localFrontedBaseUrl = $"{localPlatformSettings.Value.LocalFrontendProtocol}://{localPlatformSettings.Value.LocalFrontendHostname}";
    }

    public async Task<List<LocalFrontendInfo>> GetLocalFrontendDevPorts()
    {
        var ports = new List<LocalFrontendInfo>();
        for (int i = PortRange.Start.Value; i < PortRange.End.Value; i++)
        {
            try
            {
                var response =
                    await _httpClient.GetAsync($"{_localFrontedBaseUrl}:{i.ToString()}/");
                if (response.Headers.TryGetValues("X-Altinn-Frontend-Branch", out var values))
                {
                    
                    ports.Add(new LocalFrontendInfo()
                    {
                        Port = i.ToString(),
                        Branch = values?.First() ?? "Unknown"
                    });
                }
            }
            catch(HttpRequestException)
            {
                
            }
        }
        return ports;
    }
}