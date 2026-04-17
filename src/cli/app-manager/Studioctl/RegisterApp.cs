using Altinn.Studio.AppManager.Discovery;
using Altinn.Studio.AppManager.Platform.PortListeners;

namespace Altinn.Studio.AppManager.Studioctl;

internal sealed class RegisterApp
{
    private static readonly TimeSpan _pollInterval = TimeSpan.FromMilliseconds(500);

    private readonly AppRegistry _registry;
    private readonly PortListeners _portListeners;
    private readonly AppMetadataProbe _probe;

    public RegisterApp(AppRegistry registry, PortListeners portListeners, AppMetadataProbe probe)
    {
        _registry = registry;
        _portListeners = portListeners;
        _probe = probe;
    }

    public async Task<RegisterAppResult> Handle(RegisterAppCommand command, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(command.AppId))
            return RegisterAppResult.InvalidRequest("appId is required");

        if (command.GracePeriod <= TimeSpan.Zero)
            return RegisterAppResult.InvalidRequest("gracePeriodSeconds must be positive");

        var appId = command.AppId.Trim();
        var description = string.IsNullOrWhiteSpace(command.Description)
            ? $"studioctl app {appId}"
            : command.Description;

        var hasPort = command.Port.HasValue;
        var hasProcessId = command.ProcessId.HasValue;
        if (hasPort == hasProcessId)
            return RegisterAppResult.InvalidRequest("exactly one of port or processId is required");

        if (command.Port is { } port)
        {
            if (!AppEndpointUri.TryLoopbackHttp(port, out var baseUri) || baseUri is null)
                return RegisterAppResult.InvalidRequest("port must be in range 1-65535");

            return await WaitForMatchingApp(
                appId,
                _ => Task.FromResult<IReadOnlyList<Uri>>([baseUri]),
                description,
                command.GracePeriod,
                cancellationToken
            );
        }

        if (command.ProcessId is not { } processId || processId <= 0)
            return RegisterAppResult.InvalidRequest("processId must be positive");

        return await WaitForMatchingApp(
            appId,
            token => ProcessListenerUris(processId, token),
            description,
            command.GracePeriod,
            cancellationToken
        );
    }

    private async Task<RegisterAppResult> WaitForMatchingApp(
        string appId,
        Func<CancellationToken, Task<IReadOnlyList<Uri>>> candidateUris,
        string description,
        TimeSpan gracePeriod,
        CancellationToken cancellationToken
    )
    {
        var deadline = TimeProvider.System.GetUtcNow() + gracePeriod;
        while (true)
        {
            cancellationToken.ThrowIfCancellationRequested();
            foreach (var baseUri in await candidateUris(cancellationToken))
            {
                var resolvedAppId = await _probe.Probe(baseUri, cancellationToken);
                if (!string.Equals(resolvedAppId, appId, StringComparison.OrdinalIgnoreCase))
                    continue;

                _registry.Register(appId, baseUri, description, gracePeriod);
                return RegisterAppResult.Registered(baseUri);
            }

            var delay = deadline - TimeProvider.System.GetUtcNow();
            if (delay <= TimeSpan.Zero)
                return RegisterAppResult.NotFound("matching app endpoint not found");

            await Task.Delay(delay < _pollInterval ? delay : _pollInterval, cancellationToken);
        }
    }

    private async Task<IReadOnlyList<Uri>> ProcessListenerUris(int processId, CancellationToken cancellationToken)
    {
        var listeners = await _portListeners.Get(cancellationToken);
        var uris = new List<Uri>();
        foreach (var listener in listeners.Where(listener => listener.ProcessId == processId))
        {
            if (AppEndpointUri.TryFromListener(listener, out var baseUri) && baseUri is not null)
                uris.Add(baseUri);
        }

        return uris;
    }
}

internal sealed record RegisterAppCommand(
    string? AppId,
    int? Port,
    int? ProcessId,
    string? Description,
    TimeSpan GracePeriod
);

internal sealed record RegisterAppResult(RegisterAppResultKind Kind, Uri? BaseUri, string Message)
{
    public static RegisterAppResult Registered(Uri baseUri) =>
        new(RegisterAppResultKind.Registered, baseUri, "app registered");

    public static RegisterAppResult InvalidRequest(string message) =>
        new(RegisterAppResultKind.InvalidRequest, null, message);

    public static RegisterAppResult NotFound(string message) => new(RegisterAppResultKind.NotFound, null, message);
}

internal enum RegisterAppResultKind
{
    Registered,
    InvalidRequest,
    NotFound,
}
