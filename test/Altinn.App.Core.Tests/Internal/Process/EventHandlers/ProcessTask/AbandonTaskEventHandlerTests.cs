using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Process.EventHandlers.ProcessTask;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Altinn.App.Core.Tests.Internal.Process.EventHandlers.ProcessTask;

public class AbandonTaskEventHandlerTests
{
    private sealed record Fixture(IServiceProvider ServiceProvider) : IDisposable
    {
        public AbandonTaskEventHandler Handler =>
            (AbandonTaskEventHandler)ServiceProvider.GetRequiredService<IAbandonTaskEventHandler>();

        public void Dispose() => (ServiceProvider as IDisposable)?.Dispose();

        public static Fixture Create(IEnumerable<IProcessTaskAbandon> handlers)
        {
            var services = new ServiceCollection();

            services.AddAppImplementationFactory();

            services.AddTransient<IAbandonTaskEventHandler, AbandonTaskEventHandler>();

            foreach (var handler in handlers)
                services.AddTransient(_ => handler);

            return new Fixture(services.BuildStrictServiceProvider());
        }
    }

    [Fact]
    public async Task Execute_handles_no_IProcessTaskAbandon_injected()
    {
        using var fixture = Fixture.Create([]);
        AbandonTaskEventHandler abandonTaskEventHandler = fixture.Handler;
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
        using var fixture = Fixture.Create([abandonOne.Object, abandonTwo.Object]);
        AbandonTaskEventHandler abandonTaskEventHandler = fixture.Handler;
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
