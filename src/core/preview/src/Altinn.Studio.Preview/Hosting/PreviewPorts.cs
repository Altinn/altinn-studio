namespace Altinn.Studio.Preview.Hosting;

/// <summary>
/// The ports the service listens on. The load balancer reaches the public port, and only Designer reaches the internal
/// one, as the NetworkPolicy in <c>infra/kustomize/base/networkpolicy.yaml</c> allows.
/// </summary>
internal static class PreviewPorts
{
    public const int Public = 8080;
    public const int Internal = 8081;
}
