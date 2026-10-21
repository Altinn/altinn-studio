namespace Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskStart;

/// <summary>
/// Runs the start pipeline of the current task's type (see <see cref="ProcessTaskStageCommand"/>).
/// </summary>
internal sealed class StartTask : ProcessTaskStageCommand
{
    public static string Key => "StartTask";

    public StartTask(ProcessTaskResolver processTaskResolver)
        : base(processTaskResolver) { }

    public override string GetKey() => Key;

    protected override ProcessTaskPhase Phase => ProcessTaskPhase.Start;
}
