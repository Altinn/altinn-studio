#nullable enable
using Altinn.Studio.AppTunnel;
using LocalTest.Configuration;
using LocalTest.Models;
using LocalTest.Services.LocalFrontend.Interface;
using LocalTest.Tunnel;
using Microsoft.Extensions.Options;

namespace LocalTest.Services.LocalFrontend;

public class LocalFrontendService : ILocalFrontendService
{
    private readonly AppTunnelClient _appTunnelClient;
    private readonly string _localtestBaseUrl;

    public LocalFrontendService(AppTunnelClient appTunnelClient, IOptions<GeneralSettings> generalSettings)
    {
        _appTunnelClient = appTunnelClient;
        _localtestBaseUrl = generalSettings.Value.GetBaseUrl;
    }

    public async Task<List<LocalFrontendInfo>> GetLocalFrontendDevPorts()
    {
        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, "/");
            using var response = await _appTunnelClient.SendToTarget(
                request,
                TunnelDefaults.FrontendDevServerTarget,
                TunnelDefaults.FrontendDevServerPort,
                CancellationToken.None
            );
            if (response.Headers.TryGetValues("X-Altinn-Frontend-Branch", out var values))
            {
                return
                [
                    new LocalFrontendInfo
                    {
                        Port = TunnelDefaults.FrontendDevServerPort.ToString(),
                        Branch = values?.First() ?? "Unknown",
                        Url = FrontendUrl(),
                    },
                ];
            }
        }
        catch (Exception e) when (e is HttpRequestException or InvalidOperationException)
        {
        }

        return [];
    }

    private string FrontendUrl()
    {
        var uri = new Uri(_localtestBaseUrl);
        return new UriBuilder(uri)
        {
            Host = "app-frontend.local.altinn.cloud",
            Path = "",
            Query = "",
        }.Uri.ToString();
    }
}
