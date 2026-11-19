namespace WorkflowEngine.Operator.Commands.OperatorCommand;

/// <summary>
/// The keys of the attributes this host sets on telemetry. The engine puts the fields of
/// <see cref="OperatorWorkflowContext"/> on the step's span and the workflow's entry span. The callback span of
/// <see cref="OperatorCommand"/> carries the command key.
/// </summary>
/// <remarks>
/// This host is a process of the core operator, so its keys are under <c>altinn.core_operator.</c>. The operator sets
/// the same keys on its spans, so one search finds a run in both. Dashboards and trace searches use the keys, so a
/// rename breaks them.
/// </remarks>
internal static class OperatorTelemetryAttributes
{
    /// <summary>The key of <see cref="OperatorWorkflowContext.Domain"/>.</summary>
    public const string Domain = "altinn.core_operator.domain";

    /// <summary>The key of <see cref="OperatorWorkflowContext.Caller"/>.</summary>
    public const string Caller = "altinn.core_operator.caller";

    /// <summary>The key of <see cref="OperatorWorkflowContext.SubjectId"/>.</summary>
    public const string SubjectId = "altinn.core_operator.subject_id";

    /// <summary>The key of the step's command key, on the callback span.</summary>
    public const string OperatorCommandKey = "altinn.core_operator.command_key";
}
