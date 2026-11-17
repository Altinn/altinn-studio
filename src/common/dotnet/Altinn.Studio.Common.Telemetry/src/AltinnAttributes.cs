using System.Diagnostics;

namespace Altinn.Studio.Common.Telemetry;

/// <summary>
/// The shared Altinn vocabulary of the observability standard: one attribute name per concept, the same in every
/// service and every signal. Values are the identifiers Altinn already uses, in lowercase. A service's own attributes are under <c>altinn.&lt;service&gt;.</c> instead.
/// </summary>
public static class AltinnAttributes
{
    private const string AlwaysSampleValue = "always";

    /// <summary>
    /// The service owner the work is done for, by its short name, such as <c>ttd</c>. On metrics too.
    /// </summary>
    public const string ServiceOwner = "altinn.service_owner";

    /// <summary>
    /// The app's name without its service owner, so always used with <see cref="ServiceOwner"/>. On metrics too, but a
    /// shared service then raises the SDK's cardinality limit.
    /// </summary>
    public const string App = "altinn.app";

    /// <summary>
    /// The runtime environment an operation targets, such as <c>tt02</c> for a deploy from Designer. Set only outside
    /// the runtime: a runtime service's own environment is the resource's <c>deployment.environment.name</c>.
    /// </summary>
    public const string Environment = "altinn.environment";

    /// <summary>
    /// The type of the Studio repository the work concerns: <c>app</c>, <c>datamodels</c>, <c>content</c> or
    /// <c>resources</c>.
    /// </summary>
    public const string RepoType = "altinn.repo_type";

    /// <summary>
    /// An app instance's GUID, without the instance owner's party ID. Never on metrics.
    /// </summary>
    public const string InstanceGuid = "altinn.instance.guid";

    /// <summary>
    /// The ID of the Azure DevOps build that deploys or undeploys an app, which links Designer's, the pipeline's and the
    /// runtime's parts of it. Never on metrics. Not under <c>altinn.app.</c>, since <see cref="App"/> is an attribute
    /// and can't also be a namespace.
    /// </summary>
    public const string AppDeployBuildId = "altinn.app_deploy.build.id";

    /// <summary>
    /// Marks a span whose trace the collectors' tail sampling always keeps. See <see cref="SetAlwaysSample"/>.
    /// </summary>
    public const string Sampling = "altinn.studio.sampling";

    /// <summary>
    /// Marks the span so that the collectors keep its whole trace. Tail sampling is decided per cluster, so each
    /// service marks its own part of a trace that must be kept.
    /// </summary>
    public static void SetAlwaysSample(this Activity? activity) => activity?.SetTag(Sampling, AlwaysSampleValue);
}
