using System.Reflection;
using Altinn.Studio.AppManager.Discovery;
using Altinn.Studio.AppManager.Platform;
using Altinn.Studio.AppManager.Platform.PortListeners;
using Altinn.Studio.AppManager.Tunnel;

namespace Altinn.Studio.AppManager.Studioctl;

internal static class Endpoints
{
    private static readonly TimeSpan _registerPollInterval = TimeSpan.FromMilliseconds(500);

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
            if (!AppEndpointUri.TryLoopbackHttp(port, out var baseUri) || baseUri is null)
                return Results.BadRequest(new CommandResponse("port must be in range 1-65535"));

            var result = await WaitForMatchingApp(
                registry,
                probe,
                appId,
                _ => Task.FromResult<IReadOnlyList<Uri>>([baseUri]),
                description,
                TimeSpan.FromSeconds(request.GracePeriodSeconds),
                cancellationToken
            );
            return result ?? Results.NotFound(new CommandResponse("matching app endpoint not found"));
        }

        if (request.ProcessId is not { } processId || processId <= 0)
            return Results.BadRequest(new CommandResponse("processId must be positive"));

        var processResult = await WaitForMatchingApp(
            registry,
            probe,
            appId,
            token => ProcessListenerUris(portListeners, processId, token),
            description,
            TimeSpan.FromSeconds(request.GracePeriodSeconds),
            cancellationToken
        );
        return processResult ?? Results.NotFound(new CommandResponse("matching app endpoint not found"));
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

    private static async Task<IResult?> WaitForMatchingApp(
        AppRegistry registry,
        AppMetadataProbe probe,
        string appId,
        Func<CancellationToken, Task<IReadOnlyList<Uri>>> candidateUris,
        string description,
        TimeSpan gracePeriod,
        CancellationToken cancellationToken
    )
    {
        var deadline = TimeProvider.System.GetUtcNow() + gracePeriod;
        while (true)
        {
            cancellationToken.ThrowIfCancellationRequested();
            foreach (var baseUri in await candidateUris(cancellationToken))
            {
                var resolvedAppId = await probe.Probe(baseUri, cancellationToken);
                if (!string.Equals(resolvedAppId, appId, StringComparison.OrdinalIgnoreCase))
                    continue;

                registry.Register(appId, baseUri, description, gracePeriod);
                return Results.Accepted(value: new RegisterAppResponse("app registered", baseUri.ToString()));
            }

            var delay = deadline - TimeProvider.System.GetUtcNow();
            if (delay <= TimeSpan.Zero)
                return null;

            await Task.Delay(delay < _registerPollInterval ? delay : _registerPollInterval, cancellationToken);
        }
    }

    private static async Task<IReadOnlyList<Uri>> ProcessListenerUris(
        PortListeners portListeners,
        int processId,
        CancellationToken cancellationToken
    )
    {
        var listeners = await portListeners.Get(cancellationToken);
        var uris = new List<Uri>();
        foreach (var listener in listeners.Where(listener => listener.ProcessId == processId))
        {
            if (AppEndpointUri.TryFromListener(listener, out var baseUri) && baseUri is not null)
                uris.Add(baseUri);
        }

        return uris;
    }

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
