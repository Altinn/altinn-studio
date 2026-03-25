using Altinn.Studio.AppManager.Platform;
using Altinn.Studio.AppManager.Studioctl;
using Altinn.Studio.AppManager.Tunnel;
using Microsoft.AspNetCore.Server.Kestrel.Core;

namespace Altinn.Studio.AppManager;

internal static class Program
{
    public static Task Main(string[] args)
    {
        var builder = WebApplication.CreateSlimBuilder(args);

        builder.WebHost.ConfigureKestrel(
            (context, options) =>
            {
                IpcListener.Configure(context.Configuration, options);
            }
        );

        var app = builder.Build();
        var api = app.MapGroup("/api/v1");
        api.MapGet("/healthz", () => Results.Ok(new HealthResponse("ok")));
        api.MapStudioctlEndpoints();
        api.MapTunnelEndpoints();

        return app.RunAsync();
    }

    private sealed record HealthResponse(string Status);
}
