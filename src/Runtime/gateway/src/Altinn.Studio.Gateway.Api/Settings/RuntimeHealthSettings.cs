namespace Altinn.Studio.Gateway.Api.Settings;

/// <summary>
/// Settings for the runtime checks that the public health endpoint reports.
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
    /// The relay's health endpoint at the address apps call for PDFs, so the check takes the route their requests
    /// take.
    /// </summary>
#pragma warning disable S5332 // In-cluster service URL; transport security is provided by the Linkerd mesh (mTLS)
    public Uri Pdf3Url { get; set; } = new("http://pdf-generator.pdf.svc.cluster.local/pdf/health");
#pragma warning restore S5332

    /// <summary>
    /// How often the checks run.
    /// </summary>
    public TimeSpan Period { get; set; } = TimeSpan.FromSeconds(30);

    /// <summary>
    /// How long one check may take. Above Linkerd's 3 second fail-fast timeout, so a request that has no route
    /// fails with Linkerd's answer rather than ours.
    /// </summary>
    public TimeSpan Timeout { get; set; } = TimeSpan.FromSeconds(10);
}
