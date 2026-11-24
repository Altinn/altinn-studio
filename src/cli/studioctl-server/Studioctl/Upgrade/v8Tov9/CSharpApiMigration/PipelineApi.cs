namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// The names in the App library's v9 pipeline API that the upgrade writes. A test checks them against the library's
/// public API.
/// </summary>
internal static class PipelineApi
{
    public const string Namespace = "Altinn.App.Core.Features.Process";

    public const string Builder = "PipelineBuilder";

    public const string ServiceTaskVariant = "ServiceTask";

    public const string LifecycleVariant = "Lifecycle";

    public const string ServiceTaskBuilder = Builder + "." + ServiceTaskVariant;

    public const string LifecycleBuilder = Builder + "." + LifecycleVariant;

    public const string DefineExecute = "DefineExecute";

    public const string Stage = "Stage";

    public const string ExternalStage = "ExternalStage";

    /// <summary>
    /// <c>ExternalStage</c>'s parameter for the timeout, which the upgrade passes by name, as it does
    /// <see cref="OnTimeout"/> and <see cref="Options"/>.
    /// </summary>
    public const string Timeout = "timeout";

    public const string OnTimeout = "onTimeout";

    public const string Options = "options";

    public const string StageResult = "StageResult";

    public const string ServiceTaskResult = "ServiceTaskResult";

    public const string ServiceTaskReplyResult = "ServiceTaskReplyResult";
}
