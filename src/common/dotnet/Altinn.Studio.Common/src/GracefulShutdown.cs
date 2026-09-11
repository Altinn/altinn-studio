using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Altinn.Studio.Common;

internal static class GracefulShutdown
{
    internal static IServiceCollection AddGracefulShutdown(
        this IServiceCollection services,
        IHostEnvironment environment,
        TimeSpan endpointDrainDelay,
        TimeSpan applicationShutdownTimeout
    )
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(environment);

        if (endpointDrainDelay < TimeSpan.Zero)
            throw new ArgumentOutOfRangeException(
                nameof(endpointDrainDelay),
                "The endpoint drain delay cannot be negative."
            );
        if (applicationShutdownTimeout <= TimeSpan.Zero)
            throw new ArgumentOutOfRangeException(
                nameof(applicationShutdownTimeout),
                "The application shutdown timeout must be greater than zero."
            );

        if (environment.IsDevelopment())
            return services;

        services.AddSingleton<IHostLifetime>(serviceProvider =>
            ActivatorUtilities.CreateInstance<AppHostLifetime>(serviceProvider, endpointDrainDelay)
        );
        services.Configure<HostOptions>(options => options.ShutdownTimeout = applicationShutdownTimeout);

        return services;
    }

    private sealed class AppHostLifetime(
        ILogger<AppHostLifetime> logger,
        IHostEnvironment environment,
        IHostApplicationLifetime applicationLifetime,
        TimeSpan endpointDrainDelay
    ) : IHostLifetime, IDisposable
    {
        private IDisposable[]? _signalRegistrations;

        public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

        public Task WaitForStartAsync(CancellationToken cancellationToken)
        {
            Debug.Assert(!environment.IsDevelopment(), "Graceful shutdown is not registered in development environments");
            PosixSignalRegistration? sigint = null;
            PosixSignalRegistration? sigquit = null;
            PosixSignalRegistration? sigterm = null;
            try
            {
#pragma warning disable CA2000 // Ownership is transferred to _signalRegistrations or disposed in the catch block.
                sigint = PosixSignalRegistration.Create(PosixSignal.SIGINT, HandleSignal);
                sigquit = PosixSignalRegistration.Create(PosixSignal.SIGQUIT, HandleSignal);
                sigterm = PosixSignalRegistration.Create(PosixSignal.SIGTERM, HandleSignal);
#pragma warning restore CA2000
                _signalRegistrations = [sigint, sigquit, sigterm];
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

        private void HandleSignal(PosixSignalContext context)
        {
            logger.LogInformation("Received shutdown signal: {Signal}, delaying shutdown", context.Signal);
            context.Cancel = true;

            _ = Task.Delay(endpointDrainDelay)
                .ContinueWith(
                    _ =>
                    {
                        logger.LogInformation("Starting host shutdown...");
                        applicationLifetime.StopApplication();
                    },
                    TaskScheduler.Default
                );
        }

        public void Dispose()
        {
            foreach (var registration in _signalRegistrations ?? [])
                TryDispose(registration);
        }

        private void TryDispose(IDisposable? disposable)
        {
            if (disposable is null)
                return;

            try
            {
                disposable.Dispose();
            }
            catch (Exception exception)
            {
                logger.LogError(exception, "Error during disposal of {Type}", disposable.GetType().FullName);
            }
        }
    }
}
