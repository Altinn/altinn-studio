namespace Altinn.Studio.Gateway.Api.Settings;

/// <summary>
/// Settings for the runtime checks that the public health endpoint reports. They are read at startup.
/// </summary>
internal sealed class RuntimeHealthSettings
{
    public const string SectionName = "RuntimeHealth";

    /// <summary>
    /// Whether to check pdf3. Off where nothing routes apps' PDF requests to the relay, such as the local kind
    /// cluster.
    /// </summary>
    public bool CheckPdf3 { get; set; } = true;

    /// <summary>
    /// Whether to check the platform proxy. Off where it doesn't run, such as the local kind cluster.
    /// </summary>
    public bool CheckPlatformProxy { get; set; } = true;

#pragma warning disable S5332 // In-cluster service URL; transport security is provided by the Linkerd mesh (mTLS)
    private const string DefaultPlatformProxyAddress = "http://platform-proxy.runtime-platform-proxy.svc.cluster.local";
#pragma warning restore S5332

    /// <summary>
    /// The platform proxy's address in the runtime cluster.
    /// </summary>
    public Uri PlatformProxyAddress { get; set; } = new(DefaultPlatformProxyAddress);

    /// <summary>
    /// How often the checks run.
    /// </summary>
    public TimeSpan Period { get; set; } = TimeSpan.FromSeconds(30);

    /// <summary>
    /// How long one check may take before it counts as unhealthy. Above Linkerd's 3 second fail-fast timeout, so a
    /// request that has no route fails with Linkerd's answer rather than ours.
    /// </summary>
    public TimeSpan Timeout { get; set; } = TimeSpan.FromSeconds(10);
}
