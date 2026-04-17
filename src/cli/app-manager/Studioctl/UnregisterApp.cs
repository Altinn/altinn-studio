using Altinn.Studio.AppManager.Discovery;

namespace Altinn.Studio.AppManager.Studioctl;

internal sealed class UnregisterApp
{
    private readonly AppRegistry _registry;

    public UnregisterApp(AppRegistry registry)
    {
        _registry = registry;
    }

    public UnregisterAppResult Handle(string? appId, Uri baseUri)
    {
        if (string.IsNullOrWhiteSpace(appId))
            return UnregisterAppResult.InvalidRequest("appId is required");

        _registry.Unregister(appId.Trim(), baseUri);
        return UnregisterAppResult.Unregistered();
    }
}

internal sealed record UnregisterAppResult(UnregisterAppResultKind Kind, string Message)
{
    public static UnregisterAppResult Unregistered() => new(UnregisterAppResultKind.Unregistered, "app unregistered");

    public static UnregisterAppResult InvalidRequest(string message) =>
        new(UnregisterAppResultKind.InvalidRequest, message);
}

internal enum UnregisterAppResultKind
{
    Unregistered,
    InvalidRequest,
}
