using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Altinn.Studio.Common;

/// <summary>
/// Host lifetime implementation with graceful shutdown support.
/// </summary>
/// <remarks>
/// Based on .NET's Kubernetes graceful shutdown guidance:
/// https://github.com/dotnet/dotnet-docker/blob/main/samples/kubernetes/graceful-shutdown/graceful-shutdown.md
/// </remarks>
internal sealed class AppHostLifetime(
    ILogger<AppHostLifetime> logger,
    IHostEnvironment environment,
    IHostApplicationLifetime applicationLifetime,
    TimeProvider timeProvider,
    TimeSpan endpointDrainDelay
) : IHostLifetime, IDisposable
{
    private IDisposable[]? _signalRegistrations;
    private int _shutdownScheduled;

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
        context.Cancel = true;
        ScheduleShutdown(context.Signal);
    }

    internal void ScheduleShutdown(PosixSignal signal)
    {
        if (Interlocked.Exchange(ref _shutdownScheduled, 1) != 0)
            return;

        logger.LogInformation("Received shutdown signal: {Signal}, delaying shutdown", signal);
        _ = StartShutdownAfterDelay();
    }

    private async Task StartShutdownAfterDelay()
    {
        await Task.Delay(endpointDrainDelay, timeProvider);
        logger.LogInformation("Starting host shutdown...");
        applicationLifetime.StopApplication();
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
