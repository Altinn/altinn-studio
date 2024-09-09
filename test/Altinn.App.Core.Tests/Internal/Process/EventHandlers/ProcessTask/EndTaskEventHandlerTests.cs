using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Process.EventHandlers.ProcessTask;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Altinn.App.Core.Internal.Process.ServiceTasks;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace Altinn.App.Core.Tests.Internal.Process.EventHandlers.ProcessTask;

public class EndTaskEventHandlerTests
{
    private readonly Mock<IProcessTaskDataLocker> _processTaskDataLocker = new();
    private readonly Mock<IProcessTaskFinalizer> _processTaskFinisher = new();
    private readonly Mock<IPdfServiceTask> _pdfServiceTask = new();
    private readonly Mock<IEformidlingServiceTask> _eformidlingServiceTask = new();

    private IServiceTask[] ServiceTasks => [_pdfServiceTask.Object, _eformidlingServiceTask.Object];

    private IEnumerable<IProcessTaskEnd> _processTaskEnds = new List<IProcessTaskEnd>();
    private readonly ILogger<EndTaskEventHandler> _logger = new NullLogger<EndTaskEventHandler>();

    [Fact]
    public async Task Execute_handles_no_IProcessTaskAbandon_injected()
    {
        EndTaskEventHandler eteh = new EndTaskEventHandler(
            _processTaskDataLocker.Object,
            _processTaskFinisher.Object,
            ServiceTasks,
            _processTaskEnds,
            _logger
        );
        var instance = new Instance() { Id = "1337/fa0678ad-960d-4307-aba2-ba29c9804c9d", AppId = "ttd/test", };
        Mock<IProcessTask> mockProcessTask = new();
        await eteh.Execute(mockProcessTask.Object, "Task_1", instance);
        _processTaskDataLocker.Verify(p => p.Lock("Task_1", instance));
        _processTaskFinisher.Verify(p => p.Finalize("Task_1", instance));
        _pdfServiceTask.Verify(p => p.Execute("Task_1", instance));
        _eformidlingServiceTask.Verify(p => p.Execute("Task_1", instance));
        mockProcessTask.Verify(p => p.End("Task_1", instance));

        _processTaskDataLocker.VerifyNoOtherCalls();
        _processTaskFinisher.VerifyNoOtherCalls();
        _pdfServiceTask.VerifyNoOtherCalls();
        _eformidlingServiceTask.VerifyNoOtherCalls();
        mockProcessTask.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Execute_calls_all_added_implementations_of_IProcessTaskEnd()
    {
        Mock<IProcessTaskEnd> endOne = new();
        Mock<IProcessTaskEnd> endTwo = new();
        _processTaskEnds = new List<IProcessTaskEnd>() { endOne.Object, endTwo.Object };
        EndTaskEventHandler eteh =
            new(_processTaskDataLocker.Object, _processTaskFinisher.Object, ServiceTasks, _processTaskEnds, _logger);
        var instance = new Instance() { Id = "1337/fa0678ad-960d-4307-aba2-ba29c9804c9d", AppId = "ttd/test", };
        Mock<IProcessTask> mockProcessTask = new();
        await eteh.Execute(mockProcessTask.Object, "Task_1", instance);
        endOne.Verify(a => a.End("Task_1", instance));
        endTwo.Verify(a => a.End("Task_1", instance));
        _processTaskDataLocker.Verify(p => p.Lock("Task_1", instance));
        _processTaskFinisher.Verify(p => p.Finalize("Task_1", instance));
        _pdfServiceTask.Verify(p => p.Execute("Task_1", instance));
        _eformidlingServiceTask.Verify(p => p.Execute("Task_1", instance));
        mockProcessTask.Verify(p => p.End("Task_1", instance));

        _processTaskDataLocker.VerifyNoOtherCalls();
        _processTaskFinisher.VerifyNoOtherCalls();
        _pdfServiceTask.VerifyNoOtherCalls();
        _eformidlingServiceTask.VerifyNoOtherCalls();
        mockProcessTask.VerifyNoOtherCalls();
        endOne.VerifyNoOtherCalls();
        endTwo.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Calls_unlock_if_pdf_fails()
    {
        EndTaskEventHandler eteh =
            new(_processTaskDataLocker.Object, _processTaskFinisher.Object, ServiceTasks, _processTaskEnds, _logger);

        var instance = new Instance() { Id = "1337/fa0678ad-960d-4307-aba2-ba29c9804c9d", AppId = "ttd/test", };

        var taskId = "Task_1";
        Mock<IProcessTask> mockProcessTask = new();

        // Make PDF service task throw exception to simulate a failure situation.
        _pdfServiceTask.Setup(x => x.Execute(It.IsAny<string>(), instance)).ThrowsAsync(new Exception());

        // Expect exception to be thrown
        await Assert.ThrowsAsync<Exception>(async () => await eteh.Execute(mockProcessTask.Object, taskId, instance));

        // Assert normal flow until the exception is thrown
        _processTaskDataLocker.Verify(p => p.Lock(taskId, instance));
        _processTaskFinisher.Verify(p => p.Finalize(taskId, instance));
        mockProcessTask.Verify(p => p.End(taskId, instance));
        _pdfServiceTask.Verify(p => p.Execute(taskId, instance));

        // Make sure unlock data is called
        _processTaskDataLocker.Verify(p => p.Unlock(taskId, instance));

        // Make sure eFormidling service task is not called if PDF failed.
        _eformidlingServiceTask.Verify(p => p.Execute(taskId, instance), Times.Never);
    }

    [Fact]
    public async Task Calls_unlock_if_eFormidling_fails()
    {
        EndTaskEventHandler eteh =
            new(_processTaskDataLocker.Object, _processTaskFinisher.Object, ServiceTasks, _processTaskEnds, _logger);

        var instance = new Instance() { Id = "1337/fa0678ad-960d-4307-aba2-ba29c9804c9d", AppId = "ttd/test", };

        var taskId = "Task_1";
        Mock<IProcessTask> mockProcessTask = new();

        // Make PDF service task throw exception to simulate a failure situation.
        _eformidlingServiceTask.Setup(x => x.Execute(It.IsAny<string>(), instance)).ThrowsAsync(new Exception());

        // Expect exception to be thrown
        await Assert.ThrowsAsync<Exception>(async () => await eteh.Execute(mockProcessTask.Object, taskId, instance));

        // Assert normal flow until the exception is thrown
        _processTaskDataLocker.Verify(p => p.Lock(taskId, instance));
        _processTaskFinisher.Verify(p => p.Finalize(taskId, instance));
        mockProcessTask.Verify(p => p.End(taskId, instance));
        _pdfServiceTask.Verify(p => p.Execute(taskId, instance));

        // Make sure unlock data is called
        _processTaskDataLocker.Verify(p => p.Unlock(taskId, instance));
    }

    [Fact]
    public void Throws_If_Missing_Pdf_ServiceTask()
    {
        IServiceTask[] serviceTasks = [_eformidlingServiceTask.Object];

        var ex = Assert.Throws<InvalidOperationException>(
            () =>
                new EndTaskEventHandler(
                    _processTaskDataLocker.Object,
                    _processTaskFinisher.Object,
                    serviceTasks,
                    _processTaskEnds,
                    _logger
                )
        );
        Assert.Equal("PdfServiceTask not found in serviceTasks", ex.Message);
    }

    [Fact]
    public void Throws_If_Missing_Eformidling_ServiceTask()
    {
        IServiceTask[] serviceTasks = [_pdfServiceTask.Object];

        var ex = Assert.Throws<InvalidOperationException>(
            () =>
                new EndTaskEventHandler(
                    _processTaskDataLocker.Object,
                    _processTaskFinisher.Object,
                    serviceTasks,
                    _processTaskEnds,
                    _logger
                )
        );
        Assert.Equal("EformidlingServiceTask not found in serviceTasks", ex.Message);
    }
}
