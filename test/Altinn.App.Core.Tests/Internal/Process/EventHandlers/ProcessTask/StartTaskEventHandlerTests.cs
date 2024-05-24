using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Process.EventHandlers.ProcessTask;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Altinn.Platform.Storage.Interface.Models;
using Moq;
using Xunit;

namespace Altinn.App.Core.Tests.Internal.Process.EventHandlers.ProcessTask;

public class StartTaskEventHandlerTests
{
    private readonly Mock<IProcessTaskDataLocker> _processTaskDataLocker;
    private readonly Mock<IProcessTaskInitializer> _processTaskInitializer;
    private IEnumerable<IProcessTaskStart> _processTaskStarts;

    public StartTaskEventHandlerTests()
    {
        _processTaskDataLocker = new Mock<IProcessTaskDataLocker>();
        _processTaskInitializer = new Mock<IProcessTaskInitializer>();
        _processTaskStarts = new List<IProcessTaskStart>();
    }

    [Fact]
    public async Task Execute_handles_happy_path()
    {
        StartTaskEventHandler steh = new StartTaskEventHandler(
            _processTaskDataLocker.Object,
            _processTaskInitializer.Object,
            _processTaskStarts
        );
        var instance = new Instance() { Id = "1337/fa0678ad-960d-4307-aba2-ba29c9804c9d", AppId = "ttd/test", };
        Mock<IProcessTask> mockProcessTask = new Mock<IProcessTask>();
        await steh.Execute(mockProcessTask.Object, "Task_1", instance, []);
        _processTaskDataLocker.Verify(p => p.Unlock("Task_1", instance));
        _processTaskInitializer.Verify(p => p.Initialize("Task_1", instance, new Dictionary<string, string>()));
        mockProcessTask.Verify(p => p.Start("Task_1", instance));

        _processTaskDataLocker.VerifyNoOtherCalls();
        _processTaskInitializer.VerifyNoOtherCalls();
        mockProcessTask.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Execute_calls_all_added_implementations_of_IProcessTaskStart()
    {
        Mock<IProcessTaskStart> startOne = new Mock<IProcessTaskStart>();
        Mock<IProcessTaskStart> startTwo = new Mock<IProcessTaskStart>();
        _processTaskStarts = new List<IProcessTaskStart>() { startOne.Object, startTwo.Object, };
        StartTaskEventHandler steh = new StartTaskEventHandler(
            _processTaskDataLocker.Object,
            _processTaskInitializer.Object,
            _processTaskStarts
        );
        var instance = new Instance() { Id = "1337/fa0678ad-960d-4307-aba2-ba29c9804c9d", AppId = "ttd/test", };
        Mock<IProcessTask> mockProcessTask = new Mock<IProcessTask>();
        await steh.Execute(mockProcessTask.Object, "Task_1", instance, []);
        _processTaskDataLocker.Verify(p => p.Unlock("Task_1", instance));
        _processTaskInitializer.Verify(p => p.Initialize("Task_1", instance, new Dictionary<string, string>()));
        mockProcessTask.Verify(p => p.Start("Task_1", instance));
        startOne.Verify(p => p.Start("Task_1", instance, new Dictionary<string, string>()));
        startTwo.Verify(p => p.Start("Task_1", instance, new Dictionary<string, string>()));

        _processTaskDataLocker.VerifyNoOtherCalls();
        _processTaskInitializer.VerifyNoOtherCalls();
        mockProcessTask.VerifyNoOtherCalls();
        startOne.VerifyNoOtherCalls();
        startTwo.VerifyNoOtherCalls();
    }
}
