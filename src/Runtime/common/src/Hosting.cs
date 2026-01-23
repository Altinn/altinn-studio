using System.Diagnostics;
using System.Net;
using System.Runtime.InteropServices;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Common;

public static class Hosting
{
    extension(WebApplicationBuilder builder)
    {
        /// <summary>
        /// Configures the application with common settings.
        /// </summary>
        public WebApplicationBuilder UseCommonHostingConfiguration()
        {
            builder.UseHeaderForwarding();
            builder.UseGracefulShutdown();

            return builder;
        }

        /// <summary>
        /// Configures the application to forward headers from reverse proxies.
        /// </summary>
        /// <remarks>
        /// When running in a real environment, we are situated behind a reverse proxy/load balancer.
        /// At the time of writing, this is a Traefik ingress controller (k8s).
        /// </remarks>
        public WebApplicationBuilder UseHeaderForwarding()
        {
            builder.Services.Configure<ForwardedHeadersOptions>(options =>
            {
                options.ForwardedHeaders = ForwardedHeaders.All;
                options.ForwardLimit = 3;
                options.KnownIPNetworks.Clear();
#pragma warning disable ASPDEPR005 // Type or member is obsolete
                options.KnownNetworks.Clear();
#pragma warning restore ASPDEPR005 // Type or member is obsolete
                options.KnownProxies.Clear();

                if (builder.Environment.IsEnvironment("local"))
                {
                    // Running locally, let's just trust any network
                    options.KnownIPNetworks.Add(new System.Net.IPNetwork(IPAddress.Any, 0));
                    options.KnownIPNetworks.Add(new System.Net.IPNetwork(IPAddress.IPv6Any, 0));
                }
                else
                {
                    // IP ranges used internally in the deployed clusters
                    // This makes sure we only trust the X-Forwarded-* headers for requests
                    // originating from these ranges.
                    options.KnownIPNetworks.Add(
                        new System.Net.IPNetwork(IPAddress.Parse("10.240.0.0"), 16)
                    );
                    options.KnownIPNetworks.Add(
                        new System.Net.IPNetwork(IPAddress.Parse("fd10:59f0:8c79:240::"), 64)
                    );
                }
            });

            return builder;
        }

        /// <summary>
        /// Configures the application to use graceful shutdown.
        /// <para>
        /// Need to coordinate graceful shutdown (let's assume k8s as the scheduler/runtime):
        /// - deployment is configured with a terminationGracePeriod of 30s (default timeout before SIGKILL)
        /// - k8s flow of information is eventually consistent.
        ///   it takes time for knowledge of SIGTERM on the worker node to propagate to e.g. networking layers
        ///   (k8s Service -> Endspoints rotation. It takes time to be taken out of Endpoint rotation)
        /// - we want to gracefully drain ASP.NET core for requests, leaving some time for active requests to complete
        /// This leaves us with the following sequence of events
        /// - container receives SIGTERM
        /// - `AppHostLifetime` intercepts SIGTERM and delays for `shutdownDelay`
        /// - `AppHostLifetime` calls `IHostApplicationLifetime.StopApplication`, to start ASP.NET Core shutdown process
        /// - ASP.NET Core will spend a maximum of `shutdownTimeout` trying to drain active requests
        ///   (cancelable requests can combine cancellation tokens with `IHostApplicationLifetime.ApplicationStopping`)
        /// - If ASP.NET Core completes shutdown within `shutdownTimeout`, everything is fine
        /// - If ASP.NET Core is stuck or in some way can't terminate, kubelet will eventually SIGKILL
        /// </para>
        /// </summary>
        public WebApplicationBuilder UseGracefulShutdown()
        {
            var shutdownDelay = TimeSpan.FromSeconds(5);
            var shutdownTimeout = TimeSpan.FromSeconds(20);

            builder.Services.AddSingleton<IHostLifetime>(sp =>
                ActivatorUtilities.CreateInstance<AppHostLifetime>(sp, shutdownDelay)
            );

            builder.Services.Configure<HostOptions>(options =>
                options.ShutdownTimeout = shutdownTimeout
            );

            return builder;
        }
    }

    /// <summary>
    /// Host lifetime implementation with graceful shutdown support.
    /// </summary>
    /// <remarks>
    /// Based on guidance from https://github.com/dotnet/dotnet-docker/blob/2a6f35b9361d1aacb664b0ce09e529698b622d2b/samples/kubernetes/graceful-shutdown/graceful-shutdown.md
    /// </remarks>
    private sealed class AppHostLifetime(
        ILogger<AppHostLifetime> logger,
        IHostEnvironment environment,
        IHostApplicationLifetime applicationLifetime,
        TimeSpan delay
    ) : IHostLifetime, IDisposable
    {
        private IDisposable[]? _disposables;

        public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

        public Task WaitForStartAsync(CancellationToken cancellationToken)
        {
            Debug.Assert(
                !environment.IsDevelopment(),
                "We don't need graceful shutdown in development environments"
            );
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
            logger.LogInformation(
                "Received shutdown signal: {Signal}, delaying shutdown",
                ctx.Signal
            );
            ctx.Cancel = true; // Signal intercepted here, we are now responsible for calling `StopApplication`

            _ = Task.Delay(delay)
                .ContinueWith(
                    t =>
                    {
                        logger.LogInformation("Starting host shutdown...");
                        applicationLifetime.StopApplication();
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
                logger.LogError(
                    ex,
                    "Error during disposal of {Type}",
                    disposable.GetType().FullName
                );
            }
        }
    }
}
