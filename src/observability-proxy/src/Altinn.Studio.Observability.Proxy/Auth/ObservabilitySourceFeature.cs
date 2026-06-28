namespace Altinn.Studio.Observability.Proxy.Auth;

internal sealed class ObservabilitySourceFeature
{
    public ObservabilitySourceFeature(ObservabilitySource source)
    {
        Source = source;
    }

    public ObservabilitySource Source { get; }
}
