using Altinn.Studio.EnvTopology;
using Altinn.Studio.StudioctlServer.Discovery;
using Altinn.Studio.StudioctlServer.HostBridge;
using Altinn.Studio.StudioctlServer.Platform;

namespace Altinn.Studio.StudioctlServer.Studioctl;

internal static class Endpoints
{
    public static RouteGroupBuilder MapStudioctlEndpoints(this RouteGroupBuilder api)
    {
        var studioctl = api.MapGroup("/studioctl");
        studioctl.MapGet("/status", GetStatus);
        studioctl.MapPost("/apps", RegisterApp);
        studioctl.MapDelete("/apps", UnregisterApp);
        studioctl.MapPost("/shutdown", Shutdown);
        studioctl.MapPost("/apps/upgrades", RunUpgrade);
        return studioctl;
    }

    private static IResult GetStatus(
        AppRegistry registry,
        HostBridgeState hostBridgeState,
        IConfiguration configuration,
        BoundTopologyOptions boundTopologyOptions
    )
    {
        return Results.Ok(
            new StatusResponse(
                "ok",
                Environment.ProcessId,
                Environment.Version.ToString(),
                StudioctlUserAgent.Version,
                EnvironmentValues.IsTruthy(Environment.GetEnvironmentVariable("STUDIOCTL_INTERNAL_DEV")),
                Environment.GetEnvironmentVariable("Studioctl__Path") ?? "",
                configuration["Localtest:Url"] ?? "",
                boundTopologyOptions.BaseConfigPath ?? "",
                boundTopologyOptions.ConfigPath ?? "",
                new HostBridgeStatusResponse(hostBridgeState.Enabled, hostBridgeState.IsConnected, hostBridgeState.Url),
                [
                    .. registry
                        .GetAll()
                        .Select(app => new DiscoveredAppResponse(
                            app.AppId,
                            app.BaseUri.ToString(),
                            app.Source,
                            app.ProcessId,
                            app.Description,
                            app.ContainerId,
                            app.Name,
                            app.HostPort
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
                request.ProcessId,
                TimeSpan.FromSeconds(request.TimeoutSeconds),
                request.ContainerId,
                request.HostPort
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

    private static IResult UnregisterApp(UnregisterApp unregisterApp, string? appId)
    {
        var result = unregisterApp.Handle(appId);
        return result.Kind switch
        {
            UnregisterAppResultKind.Unregistered => Results.Accepted(value: new CommandResponse(result.Message)),
            _ => Results.StatusCode(StatusCodes.Status500InternalServerError),
        };
    }

    private static IResult Shutdown(IHostApplicationLifetime lifetime)
    {
        lifetime.StopApplication();
        return Results.Accepted(value: new CommandResponse("shutdown requested"));
    }

    private static async Task<IResult> RunUpgrade(
        AppUpgradeService upgrades,
        AppUpgradeRequest? request,
        CancellationToken cancellationToken
    )
    {
        if (request is null)
            return Results.BadRequest(new CommandResponse("request body is required"));

        var result = await upgrades.RunAsync(request, cancellationToken);
        if (!result.IsValid)
            return Results.BadRequest(new CommandResponse(result.Message));

        return Results.Ok(new UpgradeResponse(result.Message, result.ExitCode, result.Output, result.Error));
    }

    private sealed record StatusResponse(
        string Status,
        int ProcessId,
        string DotnetVersion,
        string StudioctlServerVersion,
        bool InternalDev,
        string StudioctlPath,
        string LocaltestUrl,
        string BoundTopologyBaseConfigPath,
        string BoundTopologyConfigPath,
        HostBridgeStatusResponse HostBridge,
        IReadOnlyList<DiscoveredAppResponse> Apps
    );

    private sealed record HostBridgeStatusResponse(bool Enabled, bool Connected, string? Url);

    private sealed record RegisterAppRequest(
        string AppId,
        int? ProcessId,
        int TimeoutSeconds,
        string? ContainerId,
        int? HostPort
    );

    private sealed record RegisterAppResponse(string Message, string BaseUrl);

    private sealed record DiscoveredAppResponse(
        string AppId,
        string BaseUrl,
        string Source,
        int? ProcessId,
        string Description,
        string? ContainerId,
        string? Name,
        int? HostPort
    );

    private sealed record CommandResponse(string Message);

    private sealed record UpgradeResponse(string Message, int ExitCode, string Output, string Error);
}
