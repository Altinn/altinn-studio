using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Process.EventHandlers.ProcessTask;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Altinn.App.Core.Internal.Process.ServiceTasks;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace Altinn.App.Core.Tests.Internal.Process.EventHandlers.ProcessTask;

public class EndTaskEventHandlerTests
{
    private sealed record Fixture(IServiceProvider ServiceProvider) : IDisposable
    {
        public Mock<T> Mock<T>()
            where T : class => Moq.Mock.Get(ServiceProvider.GetRequiredService<T>());

        public EndTaskEventHandler Handler =>
            (EndTaskEventHandler)ServiceProvider.GetRequiredService<IEndTaskEventHandler>();

        public void Dispose() => (ServiceProvider as IDisposable)?.Dispose();

        public static Fixture Create(
            IEnumerable<IProcessTaskEnd> handlers,
            bool addPdfServiceTask = true,
            bool addEformidlingServiceTask = true
        )
        {
            var services = new ServiceCollection();
            services.AddLogging(builder => builder.AddProvider(NullLoggerProvider.Instance));
            services.AddAppImplementationFactory();

            services.AddSingleton(new Mock<IProcessTaskDataLocker>().Object);
            services.AddSingleton(new Mock<IProcessTaskFinalizer>().Object);

            if (addPdfServiceTask)
            {
                Mock<IPdfServiceTask> pdfServiceTask = new();
                services.AddTransient(_ => pdfServiceTask.Object);
                services.AddTransient<IServiceTask>(_ => pdfServiceTask.Object);
            }

            if (addEformidlingServiceTask)
            {
                Mock<IEformidlingServiceTask> eformidlingServiceTask = new();
                services.AddTransient(_ => eformidlingServiceTask.Object);
                services.AddTransient<IServiceTask>(_ => eformidlingServiceTask.Object);
            }

            services.AddTransient<IEndTaskEventHandler, EndTaskEventHandler>();

            foreach (var handler in handlers)
                services.AddTransient(_ => handler);

            return new Fixture(services.BuildStrictServiceProvider());
        }
    }

    [Fact]
    public async Task Execute_handles_no_IProcessTaskAbandon_injected()
    {
        using var fixture = Fixture.Create([]);

        var eteh = fixture.Handler;

        var instance = new Instance() { Id = "1337/fa0678ad-960d-4307-aba2-ba29c9804c9d", AppId = "ttd/test" };
        Mock<IProcessTask> mockProcessTask = new();
        await eteh.Execute(mockProcessTask.Object, "Task_1", instance);
        fixture.Mock<IProcessTaskDataLocker>().Verify(p => p.Lock("Task_1", instance));
        fixture.Mock<IProcessTaskFinalizer>().Verify(p => p.Finalize("Task_1", instance));
        fixture.Mock<IPdfServiceTask>().Verify(p => p.Execute("Task_1", instance));
        fixture.Mock<IEformidlingServiceTask>().Verify(p => p.Execute("Task_1", instance));
        mockProcessTask.Verify(p => p.End("Task_1", instance));

        fixture.Mock<IProcessTaskDataLocker>().VerifyNoOtherCalls();
        fixture.Mock<IProcessTaskFinalizer>().VerifyNoOtherCalls();
        fixture.Mock<IPdfServiceTask>().VerifyNoOtherCalls();
        fixture.Mock<IEformidlingServiceTask>().VerifyNoOtherCalls();
        mockProcessTask.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Execute_calls_all_added_implementations_of_IProcessTaskEnd()
    {
        Mock<IProcessTaskEnd> endOne = new();
        Mock<IProcessTaskEnd> endTwo = new();
        using var fixture = Fixture.Create([endOne.Object, endTwo.Object]);

        var eteh = fixture.Handler;
        var instance = new Instance() { Id = "1337/fa0678ad-960d-4307-aba2-ba29c9804c9d", AppId = "ttd/test" };
        Mock<IProcessTask> mockProcessTask = new();
        await eteh.Execute(mockProcessTask.Object, "Task_1", instance);
        endOne.Verify(a => a.End("Task_1", instance));
        endTwo.Verify(a => a.End("Task_1", instance));
        fixture.Mock<IProcessTaskDataLocker>().Verify(p => p.Lock("Task_1", instance));
        fixture.Mock<IProcessTaskFinalizer>().Verify(p => p.Finalize("Task_1", instance));
        fixture.Mock<IPdfServiceTask>().Verify(p => p.Execute("Task_1", instance));
        fixture.Mock<IEformidlingServiceTask>().Verify(p => p.Execute("Task_1", instance));
        mockProcessTask.Verify(p => p.End("Task_1", instance));

        fixture.Mock<IProcessTaskDataLocker>().VerifyNoOtherCalls();
        fixture.Mock<IProcessTaskFinalizer>().VerifyNoOtherCalls();
        fixture.Mock<IPdfServiceTask>().VerifyNoOtherCalls();
        fixture.Mock<IEformidlingServiceTask>().VerifyNoOtherCalls();
        mockProcessTask.VerifyNoOtherCalls();
        endOne.VerifyNoOtherCalls();
        endTwo.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Calls_unlock_if_pdf_fails()
    {
        using var fixture = Fixture.Create([]);

        EndTaskEventHandler eteh = fixture.Handler;

        var instance = new Instance() { Id = "1337/fa0678ad-960d-4307-aba2-ba29c9804c9d", AppId = "ttd/test" };

        var taskId = "Task_1";
        Mock<IProcessTask> mockProcessTask = new();

        // Make PDF service task throw exception to simulate a failure situation.
        fixture
            .Mock<IPdfServiceTask>()
            .Setup(x => x.Execute(It.IsAny<string>(), instance))
            .ThrowsAsync(new Exception());

        // Expect exception to be thrown
        await Assert.ThrowsAsync<Exception>(async () => await eteh.Execute(mockProcessTask.Object, taskId, instance));

        // Assert normal flow until the exception is thrown
        fixture.Mock<IProcessTaskDataLocker>().Verify(p => p.Lock(taskId, instance));
        fixture.Mock<IProcessTaskFinalizer>().Verify(p => p.Finalize(taskId, instance));
        mockProcessTask.Verify(p => p.End(taskId, instance));
        fixture.Mock<IPdfServiceTask>().Verify(p => p.Execute(taskId, instance));

        // Make sure unlock data is called
        fixture.Mock<IProcessTaskDataLocker>().Verify(p => p.Unlock(taskId, instance));

        // Make sure eFormidling service task is not called if PDF failed.
        fixture.Mock<IEformidlingServiceTask>().Verify(p => p.Execute(taskId, instance), Times.Never);
    }

    [Fact]
    public async Task Calls_unlock_if_eFormidling_fails()
    {
        using var fixture = Fixture.Create([]);

        EndTaskEventHandler eteh = fixture.Handler;

        var instance = new Instance() { Id = "1337/fa0678ad-960d-4307-aba2-ba29c9804c9d", AppId = "ttd/test" };

        var taskId = "Task_1";
        Mock<IProcessTask> mockProcessTask = new();

        // Make eFormidling service task throw exception to simulate a failure situation.
        fixture
            .Mock<IEformidlingServiceTask>()
            .Setup(x => x.Execute(It.IsAny<string>(), instance))
            .ThrowsAsync(new Exception());

        // Expect exception to be thrown
        await Assert.ThrowsAsync<Exception>(async () => await eteh.Execute(mockProcessTask.Object, taskId, instance));

        // Assert normal flow until the exception is thrown
        fixture.Mock<IProcessTaskDataLocker>().Verify(p => p.Lock(taskId, instance));
        fixture.Mock<IProcessTaskFinalizer>().Verify(p => p.Finalize(taskId, instance));
        mockProcessTask.Verify(p => p.End(taskId, instance));
        fixture.Mock<IPdfServiceTask>().Verify(p => p.Execute(taskId, instance));

        // Make sure unlock data is called
        fixture.Mock<IProcessTaskDataLocker>().Verify(p => p.Unlock(taskId, instance));
    }

    [Fact]
    public async Task Throws_If_Missing_Pdf_ServiceTask()
    {
        using var fixture = Fixture.Create([], addPdfServiceTask: false);

        var eteh = fixture.Handler;

        var instance = new Instance() { Id = "1337/fa0678ad-960d-4307-aba2-ba29c9804c9d", AppId = "ttd/test" };

        var taskId = "Task_1";
        Mock<IProcessTask> mockProcessTask = new();

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(async () =>
            await eteh.Execute(mockProcessTask.Object, taskId, instance)
        );
        Assert.Equal("PdfServiceTask not found in serviceTasks", ex.Message);
    }

    [Fact]
    public async Task Throws_If_Missing_Eformidling_ServiceTask()
    {
        using var fixture = Fixture.Create([], addEformidlingServiceTask: false);

        var eteh = fixture.Handler;

        var instance = new Instance() { Id = "1337/fa0678ad-960d-4307-aba2-ba29c9804c9d", AppId = "ttd/test" };

        var taskId = "Task_1";
        Mock<IProcessTask> mockProcessTask = new();

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(async () =>
            await eteh.Execute(mockProcessTask.Object, taskId, instance)
        );
        Assert.Equal("EformidlingServiceTask not found in serviceTasks", ex.Message);
    }
}
