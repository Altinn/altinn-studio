namespace WorkflowEngine.App.Commands.AppCommand;

/// <summary>
/// Keys of the attributes this host sets on telemetry: the Altinn app instance a step works on, which
/// <see cref="AppCommand"/> returns from <c>GetTelemetryAttributes</c> for the engine to put on the step's span and
/// the workflow's entry span, and the command key on <see cref="AppCommand"/>'s own callback span.
/// </summary>
/// <remarks>
/// The instance keys are the shared Altinn vocabulary, <c>altinn.</c> followed by the concept, so a trace is found
/// by the same key whichever Altinn service it passed through. The command key names this host's
/// <see cref="AppCommand"/>, and lives under <c>altinn.workflow_engine.</c> because this host is the workflow
/// engine's Altinn-app deployment. The keys are a contract with dashboards and trace searches, so renaming one is
/// a breaking change.
/// </remarks>
internal static class AppTelemetryAttributes
{
    /// <summary>
    /// The organization that owns the service, such as <c>ttd</c>: the <c>org</c> of an Altinn app.
    /// </summary>
    public const string ServiceOwner = "altinn.service_owner";

    /// <summary>
    /// The app's name within its service owner, such as <c>e2e-tests</c>: the <c>app</c> of an Altinn app.
    /// </summary>
    public const string App = "altinn.app";

    /// <summary>
    /// The GUID of the app instance a workflow works on, as a lowercase string in the <c>D</c> format.
    /// </summary>
    public const string InstanceGuid = "altinn.instance.guid";

    /// <summary>
    /// The command key an app command calls back with — which of the app's handlers the step runs.
    /// </summary>
    public const string AppCommandKey = "altinn.workflow_engine.app_command.key";
}
