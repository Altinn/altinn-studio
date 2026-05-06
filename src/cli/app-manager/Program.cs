using System.Diagnostics;
using Altinn.Studio.AppManager.Discovery;
using Altinn.Studio.AppManager.Platform;
using Altinn.Studio.AppManager.Studioctl;
using Altinn.Studio.AppManager.Tunnel;

namespace Altinn.Studio.AppManager;

internal static class Program
{
    public static Task Main(string[] args)
    {
        var builder = WebApplication.CreateSlimBuilder(args);
        // Default reloadable config sources recurse badly on Windows when launched from a WSL UNC path.
        // Keep main app configuration env/CLI-only. Bound topology files are loaded separately as named options.
        builder.Configuration.Sources.Clear();
        builder.Configuration.AddEnvironmentVariables();
        builder.Configuration.AddCommandLine(args);

        var internalDevMode = EnvironmentValues.IsTruthy(builder.Configuration["STUDIOCTL_INTERNAL_DEV"]);

        builder.Logging.ClearProviders();
        builder.Logging.AddSimpleConsole(options =>
        {
            options.SingleLine = true;
            options.TimestampFormat = "HH:mm:ss ";
        });
        builder.Logging.AddProvider(new FileLoggerProvider(GetLogDirectory()));
        builder.Logging.SetMinimumLevel(internalDevMode ? LogLevel.Debug : LogLevel.Information);

        builder.Services.AddDiscoveryServices(builder.Configuration);
        builder.Services.AddStudioctlServices();
        builder.Services.AddTunnelServices(builder.Configuration);

        builder.WebHost.ConfigureKestrel((context, options) => IpcListener.Configure(context.Configuration, options));

        var app = builder.Build();
        RuntimeFiles.RegisterCleanup(builder.Configuration, app.Lifetime);
        app.Use(
            async (context, next) =>
            {
                var started = Stopwatch.GetTimestamp();
                await next(context);

                if (app.Logger.IsEnabled(LogLevel.Information))
                {
                    var elapsed = Stopwatch.GetElapsedTime(started);
                    app.Logger.LogInformation(
                        "Handled {Method} {Path} -> {StatusCode} in {ElapsedMs} ms",
                        context.Request.Method,
                        context.Request.Path,
                        context.Response.StatusCode,
                        elapsed.TotalMilliseconds
                    );
                }
            }
        );

        var api = app.MapGroup("/api/v1");
        api.MapGet("/healthz", () => Results.Ok(new HealthResponse("ok")));
        api.MapStudioctlEndpoints();
        api.MapTunnelEndpoints();

        return app.RunAsync();
    }

    private static string GetLogDirectory()
    {
        // studioctl launches app-manager with its working directory set to STUDIOCTL_HOME.
        // Keeping the log directory relative lets app-manager own its logging without a second log-path contract.
        return Path.Combine(Environment.CurrentDirectory, "logs", "app-manager");
    }

    private sealed record HealthResponse(string Status);
}
