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
}
