using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Process.EventHandlers.ProcessTask;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Altinn.Platform.Storage.Interface.Models;
using Moq;

namespace Altinn.App.Core.Tests.Internal.Process.EventHandlers.ProcessTask;

public class AbandonTaskEventHandlerTests
{
    private IEnumerable<IProcessTaskAbandon> _taskAbandons;

    public AbandonTaskEventHandlerTests()
    {
        _taskAbandons = new List<IProcessTaskAbandon>();
    }

    [Fact]
    public async Task Execute_handles_no_IProcessTaskAbandon_injected()
    {
        AbandonTaskEventHandler abandonTaskEventHandler = new AbandonTaskEventHandler(_taskAbandons);
        Mock<IProcessTask> mockProcessTask = new Mock<IProcessTask>();
        var instance = new Instance();
        await abandonTaskEventHandler.Execute(mockProcessTask.Object, "Task_1", instance);
        mockProcessTask.Verify(p => p.Abandon("Task_1", instance));
        mockProcessTask.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Execute_calls_all_added_implementations()
    {
        Mock<IProcessTask> mockProcessTask = new Mock<IProcessTask>();
        Mock<IProcessTaskAbandon> abandonOne = new Mock<IProcessTaskAbandon>();
        Mock<IProcessTaskAbandon> abandonTwo = new Mock<IProcessTaskAbandon>();
        _taskAbandons = new List<IProcessTaskAbandon>() { abandonOne.Object, abandonTwo.Object };
        AbandonTaskEventHandler abandonTaskEventHandler = new AbandonTaskEventHandler(_taskAbandons);
        var instance = new Instance();
        await abandonTaskEventHandler.Execute(mockProcessTask.Object, "Task_1", instance);
        mockProcessTask.Verify(p => p.Abandon("Task_1", instance));
        mockProcessTask.VerifyNoOtherCalls();
        abandonOne.Verify(a => a.Abandon("Task_1", instance));
        abandonTwo.Verify(a => a.Abandon("Task_1", instance));
        abandonOne.VerifyNoOtherCalls();
        abandonTwo.VerifyNoOtherCalls();
    }
}
