using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Process.EventHandlers.ProcessTask;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace Altinn.App.Core.Tests.Internal.Process.EventHandlers.ProcessTask;

public class StartTaskEventHandlerTests
{
    private sealed record Fixture(IServiceProvider ServiceProvider) : IDisposable
    {
        public Mock<T> Mock<T>()
            where T : class => Moq.Mock.Get(ServiceProvider.GetRequiredService<T>());

        public StartTaskEventHandler Handler =>
            (StartTaskEventHandler)ServiceProvider.GetRequiredService<IStartTaskEventHandler>();

        public void Dispose() => (ServiceProvider as IDisposable)?.Dispose();

        public static Fixture Create(IEnumerable<IProcessTaskStart> handlers)
        {
            var services = new ServiceCollection();
            services.AddLogging(builder => builder.AddProvider(NullLoggerProvider.Instance));
            services.AddAppImplementationFactory();

            services.AddSingleton(new Mock<IProcessTaskDataLocker>().Object);
            services.AddSingleton(new Mock<IProcessTaskInitializer>().Object);

            services.AddTransient<IStartTaskEventHandler, StartTaskEventHandler>();

            foreach (var handler in handlers)
                services.AddTransient(_ => handler);

            return new Fixture(services.BuildStrictServiceProvider());
        }
    }

    [Fact]
    public async Task Execute_handles_happy_path()
    {
        using var fixture = Fixture.Create([]);
        var steh = fixture.Handler;

        var instance = new Instance() { Id = "1337/fa0678ad-960d-4307-aba2-ba29c9804c9d", AppId = "ttd/test" };
        Mock<IProcessTask> mockProcessTask = new Mock<IProcessTask>();
        await steh.Execute(mockProcessTask.Object, "Task_1", instance, []);
        fixture.Mock<IProcessTaskDataLocker>().Verify(p => p.Unlock("Task_1", instance));
        fixture
            .Mock<IProcessTaskInitializer>()
            .Verify(p => p.Initialize("Task_1", instance, new Dictionary<string, string>()));
        mockProcessTask.Verify(p => p.Start("Task_1", instance));

        fixture.Mock<IProcessTaskDataLocker>().VerifyNoOtherCalls();
        fixture.Mock<IProcessTaskInitializer>().VerifyNoOtherCalls();
        mockProcessTask.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Execute_calls_all_added_implementations_of_IProcessTaskStart()
    {
        Mock<IProcessTaskStart> startOne = new Mock<IProcessTaskStart>();
        Mock<IProcessTaskStart> startTwo = new Mock<IProcessTaskStart>();
        using var fixture = Fixture.Create([startOne.Object, startTwo.Object]);
        var steh = fixture.Handler;

        var instance = new Instance() { Id = "1337/fa0678ad-960d-4307-aba2-ba29c9804c9d", AppId = "ttd/test" };
        Mock<IProcessTask> mockProcessTask = new Mock<IProcessTask>();
        await steh.Execute(mockProcessTask.Object, "Task_1", instance, []);
        fixture.Mock<IProcessTaskDataLocker>().Verify(p => p.Unlock("Task_1", instance));
        fixture
            .Mock<IProcessTaskInitializer>()
            .Verify(p => p.Initialize("Task_1", instance, new Dictionary<string, string>()));
        mockProcessTask.Verify(p => p.Start("Task_1", instance));
        startOne.Verify(p => p.Start("Task_1", instance, new Dictionary<string, string>()));
        startTwo.Verify(p => p.Start("Task_1", instance, new Dictionary<string, string>()));

        fixture.Mock<IProcessTaskDataLocker>().VerifyNoOtherCalls();
        fixture.Mock<IProcessTaskInitializer>().VerifyNoOtherCalls();
        mockProcessTask.VerifyNoOtherCalls();
        startOne.VerifyNoOtherCalls();
        startTwo.VerifyNoOtherCalls();
    }
}
