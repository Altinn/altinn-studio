using System.Reflection;
using Altinn.Studio.AppManager.Platform;
using Altinn.Studio.AppManager.Tunnel;

namespace Altinn.Studio.AppManager.Studioctl;

internal static class Endpoints
{
    public static RouteGroupBuilder MapStudioctlEndpoints(this RouteGroupBuilder api)
    {
        var studioctl = api.MapGroup("/studioctl");
        studioctl.MapGet("/status", GetStatus);
        studioctl.MapPost("/shutdown", Shutdown);
        studioctl.MapPost("/upgrades", NotImplemented);
        return studioctl;
    }

    private static IResult GetStatus(Discovery.AppRegistry registry, TunnelState tunnelState)
    {
        return Results.Ok(
            new StatusResponse(
                "ok",
                Environment.ProcessId,
                Environment.Version.ToString(),
                Assembly.GetEntryAssembly()?.GetName().Version?.ToString() ?? "unknown",
                EnvironmentValues.IsTruthy(Environment.GetEnvironmentVariable("STUDIOCTL_INTERNAL_DEV")),
                new TunnelStatusResponse(
                    tunnelState.Enabled,
                    tunnelState.IsConnected,
                    tunnelState.Url,
                    tunnelState.UpstreamUrl
                ),
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
        TunnelStatusResponse Tunnel,
        IReadOnlyList<DiscoveredAppResponse> Apps
    );

    private sealed record TunnelStatusResponse(bool Enabled, bool Connected, string? Url, string UpstreamUrl);

    private sealed record DiscoveredAppResponse(
        string AppId,
        string BaseUrl,
        string Source,
        int? ProcessId,
        string Description
    );

    private sealed record CommandResponse(string Message);
}
