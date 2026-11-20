using Altinn.App.Core.Internal.Process.ProcessTasks;

namespace Altinn.App.Core.Tests.Internal.Process.ProcessTasks;

public class NoOpProcessTasksTests
{
    [Theory]
    [InlineData(typeof(DataProcessTask))]
    [InlineData(typeof(ConfirmationProcessTask))]
    [InlineData(typeof(FeedbackProcessTask))]
    [InlineData(typeof(NullTypeProcessTask))]
    public void ATaskWithNothingToDo_ComposesNoStages_SoATransitionPlansNoLifecycleSteps(Type taskType)
    {
        var task = (IProcessTask)Activator.CreateInstance(taskType)!;

        Assert.Empty(task.ResolvePipeline(LifecyclePhase.Start).Stages);
        Assert.Empty(task.ResolvePipeline(LifecyclePhase.End).Stages);
        Assert.Empty(task.ResolvePipeline(LifecyclePhase.Abandon).Stages);
    }
}
