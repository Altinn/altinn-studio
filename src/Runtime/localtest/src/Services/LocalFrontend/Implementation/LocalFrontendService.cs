#nullable enable
using Altinn.Studio.EnvTopology;
using LocalTest.Configuration;
using LocalTest.Models;
using LocalTest.Services.LocalFrontend.Interface;
using LocalTest.Tunnel;
using Microsoft.Extensions.Options;

namespace LocalTest.Services.LocalFrontend;

public class LocalFrontendService : ILocalFrontendService
{
    private const string FrontendDevServerComponent = "frontendDevServer";

    private readonly AppTunnelClient _appTunnelClient;
    private readonly string _localtestBaseUrl;
    private readonly BoundTopologyIndexAccessor _boundTopologyIndex;

    public LocalFrontendService(
        AppTunnelClient appTunnelClient,
        IOptions<GeneralSettings> generalSettings,
        BoundTopologyIndexAccessor boundTopologyIndex
    )
    {
        _appTunnelClient = appTunnelClient;
        _localtestBaseUrl = generalSettings.Value.GetBaseUrl;
        _boundTopologyIndex = boundTopologyIndex;
    }

    public async Task<List<LocalFrontendInfo>> GetLocalFrontendDevPorts()
    {
        var frontendRoute = ResolveFrontendRoute();
        if (frontendRoute is null)
        {
            return [];
        }

        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, "/");
            using var response = await _appTunnelClient.SendToTarget(
                request,
                frontendRoute.TargetHost,
                frontendRoute.TargetPort,
                CancellationToken.None
            );
            if (response.Headers.TryGetValues("X-Altinn-Frontend-Branch", out var values))
            {
                return
                [
                    new LocalFrontendInfo
                    {
                        Port = frontendRoute.TargetPort.ToString(),
                        Branch = values?.First() ?? "Unknown",
                        Url = frontendRoute.PublicUrl,
                    },
                ];
            }
        }
        catch (Exception e) when (e is HttpRequestException or InvalidOperationException)
        {
        }

        return [];
    }

    public string DescribeFrontendUrl(string? frontendUrl)
    {
        if (string.IsNullOrWhiteSpace(frontendUrl))
        {
            return string.Empty;
        }

        var route = _boundTopologyIndex.Current.TryGetComponentRoute(FrontendDevServerComponent);
        if (
            route is not null
            && Uri.TryCreate(frontendUrl, UriKind.Absolute, out var frontendUri)
            && string.Equals(frontendUri.Host, route.PublicHost, StringComparison.OrdinalIgnoreCase)
        )
        {
            return "local app frontend dev server";
        }

        return $"frontend js and css from {frontendUrl}";
    }

    private FrontendRoute? ResolveFrontendRoute()
    {
        var route = _boundTopologyIndex.Current.TryGetComponentRoute(FrontendDevServerComponent);
        if (
            route?.HttpDestinationUri is { } destinationUri
            && string.Equals(destinationUri.Scheme, Uri.UriSchemeHttp, StringComparison.OrdinalIgnoreCase)
            && !string.IsNullOrWhiteSpace(route.PublicHost)
        )
        {
            return new FrontendRoute(destinationUri.Host, destinationUri.Port, FrontendUrl(route));
        }

        return null;
    }

    private string FrontendUrl(BoundTopologyComponentRoute route)
    {
        var uri = new Uri(_localtestBaseUrl);
        return new UriBuilder(uri)
        {
            Host = route.PublicHost,
            Path = string.IsNullOrEmpty(route.PublicPathPrefix) ? string.Empty : route.PublicPathPrefix,
            Query = string.Empty,
        }.Uri.ToString();
    }

    private sealed record FrontendRoute(string TargetHost, int TargetPort, string PublicUrl);
}
