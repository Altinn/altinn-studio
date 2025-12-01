using System.Diagnostics;
using System.Net;
using System.Runtime.InteropServices;
using Microsoft.AspNetCore.HttpOverrides;

namespace StudioGateway.Api.Hosting;

internal static class HostingExtensions
{
    public static WebApplicationBuilder AddHostingConfiguration(this WebApplicationBuilder builder)
    {
        if (builder.Environment.IsDevelopment())
            return builder;

        // When in real environments, we are running behind an reverse proxy/load balancer
        // which is at the time of writing Traefik ingress controller in k8s
        builder.Services.Configure<ForwardedHeadersOptions>(options =>
        {
            options.ForwardedHeaders = ForwardedHeaders.All;
            options.KnownIPNetworks.Clear();
            options.KnownProxies.Clear();

            // IP ranges used internally in the deployed clusters
            // This makes sure we only trust the X-Forwarded-* headers for requests
            // originating from these ranges.
            options.KnownIPNetworks.Add(new System.Net.IPNetwork(IPAddress.Parse("10.240.0.0"), 16));
            options.KnownIPNetworks.Add(new System.Net.IPNetwork(IPAddress.Parse("fd10:59f0:8c79:240::"), 64));
        });

        // Need to coordinate graceful shutdown (let's assume k8s as the scheduler/runtime):
        // - deployment is configured with a terminationGracePeriod of 30s (default timeout before SIGKILL)
        // - k8s flow of information is eventually consistent.
        //   it takes time for knowledge of SIGTERM on the worker node to propagate to e.g. networking layers
        //   (k8s Service -> Endspoints rotation. It takes time to be taken out of Endpoint rotation)
        // - we want to gracefully drain ASP.NET core for requests, leaving some time for active requests to complete
        // This leaves us with the following sequence of events
        // - container receives SIGTERM
        // - `AppHostLifetime` intercepts SIGTERM and delays for `shutdownDelay`
        // - `AppHostLifetime` calls `IHostApplicationLifetime.StopApplication`, to start ASP.NET Core shutdown process
        // - ASP.NET Core will spend a maximum of `shutdownTimeout` trying to drain active requests
        //   (cancelable requests can combine cancellation tokens with `IHostApplicationLifetime.ApplicationStopping`)
        // - If ASP.NET Core completes shutdown within `shutdownTimeout`, everything is fine
        // - If ASP.NET Core is stuck or in some way can't terminate, kubelet will eventually SIGKILL
        var shutdownDelay = TimeSpan.FromSeconds(5);
        var shutdownTimeout = TimeSpan.FromSeconds(20);

        builder.Services.AddSingleton<IHostLifetime>(sp =>
            ActivatorUtilities.CreateInstance<AppHostLifetime>(sp, shutdownDelay)
        );

        builder.Services.Configure<HostOptions>(options => options.ShutdownTimeout = shutdownTimeout);

        return builder;
    }
}

// Based on guidance in:
// https://github.com/dotnet/dotnet-docker/blob/2a6f35b9361d1aacb664b0ce09e529698b622d2b/samples/kubernetes/graceful-shutdown/graceful-shutdown.md
internal sealed class AppHostLifetime(
    ILogger<AppHostLifetime> _logger,
    IHostEnvironment _environment,
    IHostApplicationLifetime _applicationLifetime,
    TimeSpan _delay
) : IHostLifetime, IDisposable
{
    private IDisposable[]? _disposables;

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    public Task WaitForStartAsync(CancellationToken cancellationToken)
    {
        Debug.Assert(!_environment.IsDevelopment(), "We don't need graceful shutdown in development environments");
        PosixSignalRegistration? sigint = null;
        PosixSignalRegistration? sigquit = null;
        PosixSignalRegistration? sigterm = null;
        try
        {
#pragma warning disable CA2000 // Dispose objects before losing scope
            // If we get an exception, we dispose below
            // Otherwise ownership is transferred to _disposables
            // which is disposed in Dispose()
            sigint = PosixSignalRegistration.Create(PosixSignal.SIGINT, HandleSignal);
            sigquit = PosixSignalRegistration.Create(PosixSignal.SIGQUIT, HandleSignal);
            sigterm = PosixSignalRegistration.Create(PosixSignal.SIGTERM, HandleSignal);
#pragma warning restore CA2000 // Dispose objects before losing scope
            _disposables = [sigint, sigquit, sigterm];
        }
        catch
        {
            TryDispose(sigint);
            TryDispose(sigquit);
            TryDispose(sigterm);
            throw;
        }
        return Task.CompletedTask;
    }

    private void HandleSignal(PosixSignalContext ctx)
    {
        _logger.LogInformation("Received shutdown signal: {Signal}, delaying shutdown", ctx.Signal);
        ctx.Cancel = true; // Signal intercepted here, we are now responsible for calling `StopApplication`

        _ = Task.Delay(_delay)
            .ContinueWith(
                t =>
                {
                    _logger.LogInformation("Starting host shutdown...");
                    _applicationLifetime.StopApplication();
                },
                TaskScheduler.Default
            );
    }

    public void Dispose()
    {
        foreach (var disposable in _disposables ?? [])
            TryDispose(disposable);
    }

    private void TryDispose(IDisposable? disposable)
    {
        if (disposable is null)
            return;
        try
        {
            disposable.Dispose();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during disposal of {Type}", disposable.GetType().FullName);
        }
    }
}
