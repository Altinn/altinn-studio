using Altinn.App.Core.Features.Process;
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

        Assert.Empty(task.DefineStart(new PipelineBuilder()).Stages);
        Assert.Empty(task.DefineEnd(new PipelineBuilder()).Stages);
        Assert.Empty(task.DefineAbandon(new PipelineBuilder()).Stages);
    }
}
