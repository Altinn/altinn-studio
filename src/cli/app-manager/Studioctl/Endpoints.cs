using System.Reflection;
using Altinn.Studio.AppManager.Discovery;
using Altinn.Studio.AppManager.Platform;
using Altinn.Studio.AppManager.Platform.PortListeners;
using Altinn.Studio.AppManager.Tunnel;

namespace Altinn.Studio.AppManager.Studioctl;

internal static class Endpoints
{
    public static RouteGroupBuilder MapStudioctlEndpoints(this RouteGroupBuilder api)
    {
        var studioctl = api.MapGroup("/studioctl");
        studioctl.MapGet("/status", GetStatus);
        studioctl.MapPost("/apps", RegisterApp);
        studioctl.MapDelete("/apps", UnregisterApp);
        studioctl.MapPost("/shutdown", Shutdown);
        studioctl.MapPost("/upgrades", NotImplemented);
        return studioctl;
    }

    private static IResult GetStatus(AppRegistry registry, TunnelState tunnelState)
    {
        return Results.Ok(
            new StatusResponse(
                "ok",
                Environment.ProcessId,
                Environment.Version.ToString(),
                Assembly.GetEntryAssembly()?.GetName().Version?.ToString() ?? "unknown",
                EnvironmentValues.IsTruthy(Environment.GetEnvironmentVariable("STUDIOCTL_INTERNAL_DEV")),
                Environment.GetEnvironmentVariable("Studioctl__Path") ?? "",
                new TunnelStatusResponse(tunnelState.Enabled, tunnelState.IsConnected, tunnelState.Url),
                [
                    .. registry
                        .GetAll()
                        .Select(app => new DiscoveredAppResponse(
                            app.AppId,
                            app.BaseUri.ToString(),
                            app.Source,
                            app.ProcessId,
                            app.Description
                        )),
                ]
            )
        );
    }

    private static async Task<IResult> RegisterApp(
        AppRegistry registry,
        PortListeners portListeners,
        AppMetadataProbe probe,
        RegisterAppRequest? request,
        CancellationToken cancellationToken
    )
    {
        if (request is null)
            return Results.BadRequest(new CommandResponse("request body is required"));

        if (string.IsNullOrWhiteSpace(request.AppId))
            return Results.BadRequest(new CommandResponse("appId is required"));

        if (request.GracePeriodSeconds <= 0)
            return Results.BadRequest(new CommandResponse("gracePeriodSeconds must be positive"));

        var appId = request.AppId.Trim();
        var description = string.IsNullOrWhiteSpace(request.Description)
            ? $"studioctl app {appId}"
            : request.Description;

        var hasPort = request.Port.HasValue;
        var hasProcessId = request.ProcessId.HasValue;
        if (hasPort == hasProcessId)
            return Results.BadRequest(new CommandResponse("exactly one of port or processId is required"));

        if (request.Port is { } port)
        {
            if (port is <= 0 or > 65535)
                return Results.BadRequest(new CommandResponse("port must be in range 1-65535"));

            var baseUri = BuildLoopbackUri(port);
            var result = await RegisterIfAppMatches(
                registry,
                probe,
                appId,
                baseUri,
                description,
                TimeSpan.FromSeconds(request.GracePeriodSeconds),
                cancellationToken
            );
            return result ?? Results.NotFound(new CommandResponse("matching app endpoint not found"));
        }

        if (request.ProcessId is not { } processId || processId <= 0)
            return Results.BadRequest(new CommandResponse("processId must be positive"));

        var listeners = await portListeners.Get(cancellationToken);
        foreach (var listener in listeners.Where(listener => listener.ProcessId == processId))
        {
            if (!TryBuildProbeUri(listener, out var baseUri) || baseUri is null)
                continue;

            var result = await RegisterIfAppMatches(
                registry,
                probe,
                appId,
                baseUri,
                description,
                TimeSpan.FromSeconds(request.GracePeriodSeconds),
                cancellationToken
            );
            if (result is not null)
                return result;
        }

        return Results.NotFound(new CommandResponse("matching app endpoint not found"));
    }

    private static IResult UnregisterApp(AppRegistry registry, string? appId, string? baseUrl)
    {
        if (string.IsNullOrWhiteSpace(appId))
            return Results.BadRequest(new CommandResponse("appId is required"));

        if (
            string.IsNullOrWhiteSpace(baseUrl)
            || !Uri.TryCreate(baseUrl, UriKind.Absolute, out var baseUri)
            || (baseUri.Scheme != Uri.UriSchemeHttp && baseUri.Scheme != Uri.UriSchemeHttps)
        )
        {
            return Results.BadRequest(new CommandResponse("baseUrl must be an absolute http or https URL"));
        }

        registry.Unregister(appId.Trim(), baseUri);
        return Results.Accepted(value: new CommandResponse("app unregistered"));
    }

    private static async Task<IResult> Shutdown(IHostApplicationLifetime lifetime, CancellationToken cancellationToken)
    {
        _ = Task.Run(
            async () =>
            {
                await Task.Delay(TimeSpan.FromMilliseconds(50), cancellationToken);
                lifetime.StopApplication();
            },
            cancellationToken
        );

        return Results.Accepted(value: new CommandResponse("shutdown requested"));
    }

    private static IResult NotImplemented()
    {
        return Results.StatusCode(StatusCodes.Status501NotImplemented);
    }

    private static bool TryBuildProbeUri(PortListener listener, out Uri? baseUri)
    {
        switch (listener.BindScope)
        {
            case ListenerBindScope.Loopback:
            case ListenerBindScope.Any:
                baseUri = BuildLoopbackUri(listener.Port);
                return true;
            default:
                baseUri = default;
                return false;
        }
    }

    private static async Task<IResult?> RegisterIfAppMatches(
        AppRegistry registry,
        AppMetadataProbe probe,
        string appId,
        Uri baseUri,
        string description,
        TimeSpan gracePeriod,
        CancellationToken cancellationToken
    )
    {
        var resolvedAppId = await probe.Probe(baseUri, cancellationToken);
        if (!string.Equals(resolvedAppId, appId, StringComparison.OrdinalIgnoreCase))
            return null;

        registry.Register(appId, baseUri, description, gracePeriod);
        return Results.Accepted(value: new RegisterAppResponse("app registered", baseUri.ToString()));
    }

    private static Uri BuildLoopbackUri(int port) => new($"http://127.0.0.1:{port}", UriKind.Absolute);

    private sealed record StatusResponse(
        string Status,
        int ProcessId,
        string DotnetVersion,
        string AppManagerVersion,
        bool InternalDev,
        string StudioctlPath,
        TunnelStatusResponse Tunnel,
        IReadOnlyList<DiscoveredAppResponse> Apps
    );

    private sealed record TunnelStatusResponse(bool Enabled, bool Connected, string? Url);

    private sealed record RegisterAppRequest(
        string AppId,
        int? Port,
        int? ProcessId,
        string? Description,
        int GracePeriodSeconds
    );

    private sealed record RegisterAppResponse(string Message, string BaseUrl);

    private sealed record DiscoveredAppResponse(
        string AppId,
        string BaseUrl,
        string Source,
        int? ProcessId,
        string Description
    );

    private sealed record CommandResponse(string Message);
}
