using Altinn.Studio.AppManager.Discovery;

namespace Altinn.Studio.AppManager.Studioctl;

internal sealed class UnregisterApp
{
    private readonly AppRegistry _registry;

    public UnregisterApp(AppRegistry registry)
    {
        _registry = registry;
    }

    public UnregisterAppResult Handle(string? appId)
    {
        _registry.AppStopped(appId);
        return UnregisterAppResult.Unregistered();
    }
}

internal sealed record UnregisterAppResult(UnregisterAppResultKind Kind, string Message)
{
    public static UnregisterAppResult Unregistered() => new(UnregisterAppResultKind.Unregistered, "app unregistered");
}

internal enum UnregisterAppResultKind
{
    Unregistered,
}
