namespace Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskAbandon;

/// <summary>
/// Runs the abandon pipeline of the current task's type (see <see cref="ProcessTaskStageCommand"/>).
/// </summary>
internal sealed class AbandonTask : ProcessTaskStageCommand
{
    public static string Key => "AbandonTask";

    public AbandonTask(ProcessTaskResolver processTaskResolver)
        : base(processTaskResolver) { }

    public override string GetKey() => Key;

    protected override ProcessTaskPhase Phase => ProcessTaskPhase.Abandon;
}
