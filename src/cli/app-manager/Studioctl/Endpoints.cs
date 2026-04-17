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

    private static async Task<IResult> RegisterApp(
        RegisterApp registerApp,
        RegisterAppRequest? request,
        CancellationToken cancellationToken
    )
    {
        if (request is null)
            return Results.BadRequest(new CommandResponse("request body is required"));

        var result = await registerApp.Handle(
            new RegisterAppCommand(
                request.AppId,
                request.Port,
                request.ProcessId,
                request.Description,
                TimeSpan.FromSeconds(request.GracePeriodSeconds)
            ),
            cancellationToken
        );

        return result.Kind switch
        {
            RegisterAppResultKind.Registered when result.BaseUri is { } baseUri => Results.Accepted(
                value: new RegisterAppResponse(result.Message, baseUri.ToString())
            ),
            RegisterAppResultKind.InvalidRequest => Results.BadRequest(new CommandResponse(result.Message)),
            RegisterAppResultKind.NotFound => Results.NotFound(new CommandResponse(result.Message)),
            _ => Results.StatusCode(StatusCodes.Status500InternalServerError),
        };
    }

    private static IResult UnregisterApp(UnregisterApp unregisterApp, string? appId, string? baseUrl)
    {
        if (
            string.IsNullOrWhiteSpace(baseUrl)
            || !Uri.TryCreate(baseUrl, UriKind.Absolute, out var baseUri)
            || (baseUri.Scheme != Uri.UriSchemeHttp && baseUri.Scheme != Uri.UriSchemeHttps)
        )
        {
            return Results.BadRequest(new CommandResponse("baseUrl must be an absolute http or https URL"));
        }

        var result = unregisterApp.Handle(appId, baseUri);
        return result.Kind switch
        {
            UnregisterAppResultKind.Unregistered => Results.Accepted(value: new CommandResponse(result.Message)),
            UnregisterAppResultKind.InvalidRequest => Results.BadRequest(new CommandResponse(result.Message)),
            _ => Results.StatusCode(StatusCodes.Status500InternalServerError),
        };
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
