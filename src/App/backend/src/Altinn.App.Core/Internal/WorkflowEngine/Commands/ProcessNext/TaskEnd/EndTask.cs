namespace Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskEnd;

/// <summary>
/// Runs the end pipeline of the current task's type (see <see cref="ProcessTaskStageCommand"/>).
/// </summary>
internal sealed class EndTask : ProcessTaskStageCommand
{
    public static string Key => "EndTask";

    public EndTask(ProcessTaskResolver processTaskResolver)
        : base(processTaskResolver) { }

    public override string GetKey() => Key;

    protected override ProcessTaskPhase Phase => ProcessTaskPhase.End;
}
