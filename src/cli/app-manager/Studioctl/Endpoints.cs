using System.Reflection;
using Altinn.Studio.AppManager.Discovery;
using Altinn.Studio.AppManager.Platform;
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

    private static IResult RegisterApp(AppRegistry registry, RegisterAppRequest? request)
    {
        if (request is null)
            return Results.BadRequest(new CommandResponse("request body is required"));

        if (string.IsNullOrWhiteSpace(request.AppId))
            return Results.BadRequest(new CommandResponse("appId is required"));

        if (
            string.IsNullOrWhiteSpace(request.BaseUrl)
            || !Uri.TryCreate(request.BaseUrl, UriKind.Absolute, out var baseUri)
            || (baseUri.Scheme != Uri.UriSchemeHttp && baseUri.Scheme != Uri.UriSchemeHttps)
        )
        {
            return Results.BadRequest(new CommandResponse("baseUrl must be an absolute http or https URL"));
        }

        var description = string.IsNullOrWhiteSpace(request.Description)
            ? $"studioctl app {request.AppId}"
            : request.Description;
        if (request.GracePeriodSeconds <= 0)
            return Results.BadRequest(new CommandResponse("gracePeriodSeconds must be positive"));

        registry.Register(request.AppId.Trim(), baseUri, description, TimeSpan.FromSeconds(request.GracePeriodSeconds));
        return Results.Accepted(value: new CommandResponse("app registered"));
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

    private sealed record RegisterAppRequest(string AppId, string BaseUrl, string? Description, int GracePeriodSeconds);

    private sealed record DiscoveredAppResponse(
        string AppId,
        string BaseUrl,
        string Source,
        int? ProcessId,
        string Description
    );

    private sealed record CommandResponse(string Message);
}
