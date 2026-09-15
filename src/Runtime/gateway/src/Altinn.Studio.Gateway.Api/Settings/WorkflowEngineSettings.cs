namespace Altinn.Studio.Gateway.Api.Settings;

/// <summary>
/// Settings for the upstream workflow engine client. The default base URL targets the
/// in-cluster service; environments without a deployed engine keep the default and the
/// pass-through endpoints answer the "engine unavailable" envelope instead of failing startup.
/// </summary>
internal sealed class WorkflowEngineSettings
{
    public const string SectionName = "WorkflowEngine";

#pragma warning disable S5332 // In-cluster service URL; transport security is provided by the Linkerd mesh (mTLS)
    public Uri BaseUrl { get; set; } = new("http://workflow-engine-app.runtime-workflow-engine-app.svc.cluster.local");
#pragma warning restore S5332

    /// <summary>
    /// How long one upstream request may take in each of its two phases: from send until the
    /// engine's response headers arrive, and from then until its body has been streamed through.
    /// </summary>
    /// <remarks>
    /// Kept short on purpose. The engine is namespace-local and the caller (the Designer admin
    /// UI) waits synchronously, so a hung engine should turn into the "engine unavailable"
    /// envelope quickly rather than into a request that never ends. The two phases are bounded
    /// separately because <c>HttpClient.Timeout</c> covers only the first when the response is
    /// read headers-first; see <see cref="Application.UpstreamPassthroughResult"/> for the second.
    /// </remarks>
    public TimeSpan RequestTimeout { get; set; } = TimeSpan.FromSeconds(30);
}
