using Altinn.Studio.StudioctlServer.Discovery;

namespace Altinn.Studio.StudioctlServer.Studioctl;

internal sealed class RegisterApp
{
    private readonly AppRegistry _registry;

    public RegisterApp(AppRegistry registry)
    {
        _registry = registry;
    }

    public async Task<RegisterAppResult> Handle(RegisterAppCommand command, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(command.AppId))
            return RegisterAppResult.InvalidRequest("appId is required");

        if (command.Timeout <= TimeSpan.Zero)
            return RegisterAppResult.InvalidRequest("timeoutSeconds must be positive");

        var hasPort = command.HostPort.HasValue;
        var hasProcessId = command.ProcessId.HasValue;
        if (!hasPort && !hasProcessId)
            return RegisterAppResult.InvalidRequest("hostPort or processId is required");
        if (command.ProcessId is <= 0)
            return RegisterAppResult.InvalidRequest("processId must be positive");

        if (command.HostPort is { } hostPort && !AppEndpointUri.TryLoopbackHttp(hostPort, out _))
            return RegisterAppResult.InvalidRequest("hostPort must be in range 1-65535");

        try
        {
            var baseUri = await _registry.AppStarted(
                command.AppId.Trim(),
                command.ProcessId,
                command.ContainerId,
                command.HostPort,
                command.Timeout,
                cancellationToken
            );
            return RegisterAppResult.Registered(baseUri);
        }
        catch (TimeoutException ex)
        {
            return RegisterAppResult.NotFound(ex.Message);
        }
    }
}

internal sealed record RegisterAppCommand(
    string? AppId,
    int? ProcessId,
    TimeSpan Timeout,
    string? ContainerId,
    int? HostPort
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
