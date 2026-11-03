namespace WorkflowEngine.Operator.Commands.OperatorCommand;

/// <summary>
/// Keys of the attributes this host sets on telemetry: what a workflow works on, which <see cref="OperatorCommand"/>
/// returns from <c>GetTelemetryAttributes</c> for the engine to put on the step's span and the workflow's entry span,
/// and the command key on <see cref="OperatorCommand"/>'s own callback span.
/// </summary>
/// <remarks>
/// The workflow keys live under <c>altinn.core_operator.</c>, so the operator can set the same keys on its spans
/// and one search finds a run in both. The command key names this host's command, and lives under
/// <c>altinn.workflow_engine.</c> like the app host's. The keys are a contract with dashboards and trace searches, so
/// renaming one is a breaking change.
/// </remarks>
internal static class OperatorTelemetryAttributes
{
    /// <summary>
    /// The group of operator handlers a workflow belongs to, such as <c>runs</c>.
    /// </summary>
    public const string Domain = "altinn.core_operator.domain";

    /// <summary>
    /// The caller the operator works for, such as <c>assistant</c>.
    /// </summary>
    public const string Caller = "altinn.core_operator.caller";

    /// <summary>
    /// The id of the object a workflow works on within its domain, such as a run id.
    /// </summary>
    public const string SubjectId = "altinn.core_operator.subject_id";

    /// <summary>
    /// The command key an operator command calls back with: which of the operator's handlers the step runs.
    /// </summary>
    public const string OperatorCommandKey = "altinn.workflow_engine.operator_command.key";
}
