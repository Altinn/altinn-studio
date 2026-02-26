using System.Diagnostics;
using System.Runtime.InteropServices;

namespace Altinn.App.Api.Infrastructure.Lifetime;

// Based on guidance in:
// https://github.com/dotnet/dotnet-docker/blob/2a6f35b9361d1aacb664b0ce09e529698b622d2b/samples/kubernetes/graceful-shutdown/graceful-shutdown.md
internal sealed class AppHostLifetime(
    ILogger<AppHostLifetime> _logger,
    IHostEnvironment _environment,
    IHostApplicationLifetime _applicationLifetime,
    TimeSpan _delay
) : IHostLifetime, IDisposable
{
    private IEnumerable<IDisposable>? _disposables;

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    public Task WaitForStartAsync(CancellationToken cancellationToken)
    {
        Debug.Assert(!_environment.IsDevelopment(), "We don't need graceful shutdown in development environments");
        _disposables =
        [
            PosixSignalRegistration.Create(PosixSignal.SIGINT, HandleSignal),
            PosixSignalRegistration.Create(PosixSignal.SIGQUIT, HandleSignal),
            PosixSignalRegistration.Create(PosixSignal.SIGTERM, HandleSignal),
        ];
        return Task.CompletedTask;
    }

    private void HandleSignal(PosixSignalContext ctx)
    {
        _logger.LogInformation("Received shutdown signal: {Signal}, delaying shutdown", ctx.Signal);
        ctx.Cancel = true; // Signal intercepted here, we are now responsible for calling `StopApplication`
        Task.Delay(_delay)
            .ContinueWith(t =>
            {
                _logger.LogInformation("Starting host shutdown...");
                _applicationLifetime.StopApplication();
            });
    }

    public void Dispose()
    {
        foreach (var disposable in _disposables ?? [])
            disposable.Dispose();
    }
}
