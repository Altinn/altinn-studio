using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Events;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.EventHandlers;
using Altinn.App.Core.Internal.Process.EventHandlers.ProcessTask;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace Altinn.App.Core.Tests.Internal.Process;

public class ProcessEventHandlingTests
{
    private sealed record Fixture(IServiceProvider ServiceProvider) : IDisposable
    {
        public Mock<T> Mock<T>()
            where T : class => Moq.Mock.Get(ServiceProvider.GetRequiredService<T>());

        public void Dispose() => (ServiceProvider as IDisposable)?.Dispose();

        public ProcessEventHandlingDelegator Delegator =>
            (ProcessEventHandlingDelegator)ServiceProvider.GetRequiredService<IProcessEventHandlerDelegator>();
        public ProcessEventDispatcher Dispatcher =>
            (ProcessEventDispatcher)ServiceProvider.GetRequiredService<IProcessEventDispatcher>();

        public static Fixture Create(
            ServiceCollection? services = null,
            Action<AppSettings>? configureAppSettings = null
        )
        {
            services ??= new ServiceCollection();
            services.AddLogging(builder => builder.AddProvider(NullLoggerProvider.Instance));
            services.AddAppImplementationFactory();

            services.AddTransient<IProcessEventHandlerDelegator, ProcessEventHandlingDelegator>();
            services.AddTransient<IProcessEventDispatcher, ProcessEventDispatcher>();

            services.Configure<AppSettings>(settings => configureAppSettings?.Invoke(settings));

            AddMock<IInstanceClient>();
            AddMock<IAppEvents>();
            AddMock<IEventsClient>();
            AddMock<IStartTaskEventHandler>();
            AddMock<IEndTaskEventHandler>();
            AddMock<IAbandonTaskEventHandler>();
            AddMock<IEndEventEventHandler>();
            AddMock<IAppMetadata>();

            void AddMock<T>()
                where T : class
            {
                var mock = new Mock<T>();
                services.TryAddTransient(_ => mock.Object);
            }

            IProcessTask[] tasks =
            [
                new Mock<DataProcessTask>().Object,
                new Mock<ConfirmationProcessTask>().Object,
                new Mock<FeedbackProcessTask>().Object,
                new Mock<NullTypeProcessTask>().Object,
            ];
            foreach (var task in tasks)
            {
                services.AddTransient(_ => task);
            }

            return new Fixture(services.BuildStrictServiceProvider());
        }
    }

    [Fact]
    public async Task UpdateProcessAndDispatchEvents_StartEvent_instance_updated_and_events_sent_to_storage()
    {
        // Arrange
        using var fixture = Fixture.Create();

        var (delegator, dispatcher) = (fixture.Delegator, fixture.Dispatcher);

        Instance instance = new Instance()
        {
            Id = Guid.NewGuid().ToString(),
            Org = "ttd",
            AppId = "ttd/test-app",
            Process = new ProcessState()
            {
                CurrentTask = new() { Flow = 1, ElementId = "Task_1" },
            },
        };
        List<InstanceEvent> events = new List<InstanceEvent>()
        {
            new InstanceEvent()
            {
                EventType = InstanceEventType.process_StartEvent.ToString(),
                ProcessInfo = new()
                {
                    CurrentTask = new()
                    {
                        ElementId = "StartEvent",
                        AltinnTaskType = "start",
                        Name = "Start",
                    },
                },
            },
        };
        fixture.Mock<IInstanceClient>().Setup(i => i.UpdateProcessAndEvents(instance, events)).ReturnsAsync(instance);
        Dictionary<string, string> prefill = new Dictionary<string, string>();

        // Act
        await delegator.HandleEvents(instance, prefill, events);
        var result = await dispatcher.DispatchToStorage(instance, events);

        // Assert
        result.Should().Be(instance);
        fixture.Mock<IInstanceClient>().Verify(i => i.UpdateProcessAndEvents(instance, events), Times.Once);
        fixture.Mock<IInstanceClient>().VerifyNoOtherCalls();
        fixture.Mock<IAppEvents>().VerifyNoOtherCalls();
        fixture.Mock<IEventsClient>().VerifyNoOtherCalls();
    }

    [Fact]
    public async Task UpdateProcessAndDispatchEvents_StartTask_instance_updated_and_events_sent_to_storage_missing_tasktype()
    {
        // Arrange
        using var fixture = Fixture.Create();

        var (delegator, dispatcher) = (fixture.Delegator, fixture.Dispatcher);

        Instance instance = new Instance()
        {
            Id = Guid.NewGuid().ToString(),
            Org = "ttd",
            AppId = "ttd/test-app",
            Process = new ProcessState()
            {
                CurrentTask = new() { Flow = 1, ElementId = "Task_1" },
            },
        };
        List<InstanceEvent> events = new List<InstanceEvent>()
        {
            new InstanceEvent()
            {
                EventType = InstanceEventType.process_StartTask.ToString(),
                ProcessInfo = new()
                {
                    CurrentTask = new() { ElementId = "StartEvent", Name = "Start" },
                },
            },
        };
        fixture.Mock<IInstanceClient>().Setup(i => i.UpdateProcessAndEvents(instance, events)).ReturnsAsync(instance);
        Dictionary<string, string> prefill = new Dictionary<string, string>();

        // Act
        await delegator.HandleEvents(instance, prefill, events);
        var result = await dispatcher.DispatchToStorage(instance, events);

        // Assert
        result.Should().Be(instance);
        fixture.Mock<IInstanceClient>().Verify(i => i.UpdateProcessAndEvents(instance, events), Times.Once);
        fixture.Mock<IInstanceClient>().VerifyNoOtherCalls();
        fixture.Mock<IAppEvents>().VerifyNoOtherCalls();
        fixture.Mock<IEventsClient>().VerifyNoOtherCalls();
    }

    [Fact]
    public async Task UpdateProcessAndDispatchEvents_StartTask_data_instance_updated_and_events_sent_to_storage()
    {
        // Arrange
        using var fixture = Fixture.Create();

        var (delegator, dispatcher) = (fixture.Delegator, fixture.Dispatcher);

        Instance instance = new Instance()
        {
            Id = Guid.NewGuid().ToString(),
            Org = "ttd",
            AppId = "ttd/test-app",
            Process = new ProcessState()
            {
                CurrentTask = new() { Flow = 1, ElementId = "Task_1" },
            },
        };
        List<InstanceEvent> events = new List<InstanceEvent>()
        {
            new InstanceEvent()
            {
                EventType = InstanceEventType.process_StartTask.ToString(),
                ProcessInfo = new()
                {
                    CurrentTask = new()
                    {
                        ElementId = "Task_1",
                        AltinnTaskType = "data",
                        Name = "Utfylling",
                        Flow = 1,
                    },
                },
            },
        };
        fixture.Mock<IInstanceClient>().Setup(i => i.UpdateProcessAndEvents(instance, events)).ReturnsAsync(instance);
        Dictionary<string, string> prefill = new Dictionary<string, string>();

        // Act
        await delegator.HandleEvents(instance, prefill, events);
        var result = await dispatcher.DispatchToStorage(instance, events);

        // Assert
        result.Should().Be(instance);
        fixture.Mock<IInstanceClient>().Verify(i => i.UpdateProcessAndEvents(instance, events), Times.Once);
        fixture.Mock<IInstanceClient>().VerifyNoOtherCalls();
        fixture.Mock<IAppEvents>().VerifyNoOtherCalls();
        fixture.Mock<IEventsClient>().VerifyNoOtherCalls();
    }

    [Fact]
    public async Task UpdateProcessAndDispatchEvents_EndTask_confirmation_instance_updated_and_events_sent_to_storage()
    {
        // Arrange
        using var fixture = Fixture.Create();

        var (delegator, dispatcher) = (fixture.Delegator, fixture.Dispatcher);

        Instance instance = new Instance()
        {
            Id = Guid.NewGuid().ToString(),
            Org = "ttd",
            AppId = "ttd/test-app",
            Process = new ProcessState()
            {
                CurrentTask = new() { Flow = 2, ElementId = "Task_2" },
            },
        };
        List<InstanceEvent> events = new List<InstanceEvent>()
        {
            new InstanceEvent()
            {
                EventType = InstanceEventType.process_EndTask.ToString(),
                ProcessInfo = new()
                {
                    CurrentTask = new()
                    {
                        ElementId = "Task_2",
                        AltinnTaskType = "confirmation",
                        Name = "Bekreft",
                        Flow = 2,
                    },
                },
            },
        };
        fixture.Mock<IInstanceClient>().Setup(i => i.UpdateProcessAndEvents(instance, events)).ReturnsAsync(instance);
        Dictionary<string, string> prefill = new Dictionary<string, string>();

        // Act
        await delegator.HandleEvents(instance, prefill, events);
        var result = await dispatcher.DispatchToStorage(instance, events);

        // Assert
        result.Should().Be(instance);
        fixture.Mock<IInstanceClient>().Verify(i => i.UpdateProcessAndEvents(instance, events), Times.Once);
        fixture.Mock<IInstanceClient>().VerifyNoOtherCalls();
        fixture.Mock<IAppEvents>().VerifyNoOtherCalls();
        fixture.Mock<IEventsClient>().VerifyNoOtherCalls();
    }

    [Fact]
    public async Task UpdateProcessAndDispatchEvents_AbandonTask_feedback_instance_updated_and_events_sent_to_storage()
    {
        // Arrange
        using var fixture = Fixture.Create();

        var (delegator, dispatcher) = (fixture.Delegator, fixture.Dispatcher);

        Instance instance = new Instance()
        {
            Id = Guid.NewGuid().ToString(),
            Org = "ttd",
            AppId = "ttd/test-app",
            Process = new ProcessState()
            {
                CurrentTask = new() { Flow = 2, ElementId = "Task_2" },
            },
        };
        List<InstanceEvent> events = new List<InstanceEvent>()
        {
            new InstanceEvent()
            {
                EventType = InstanceEventType.process_AbandonTask.ToString(),
                ProcessInfo = new()
                {
                    CurrentTask = new()
                    {
                        ElementId = "Task_2",
                        AltinnTaskType = "feedback",
                        Name = "Bekreft",
                        Flow = 2,
                    },
                },
            },
        };
        fixture.Mock<IInstanceClient>().Setup(i => i.UpdateProcessAndEvents(instance, events)).ReturnsAsync(instance);
        Dictionary<string, string> prefill = new Dictionary<string, string>();

        // Act
        await delegator.HandleEvents(instance, prefill, events);
        var result = await dispatcher.DispatchToStorage(instance, events);

        // Assert
        result.Should().Be(instance);
        fixture.Mock<IInstanceClient>().Verify(i => i.UpdateProcessAndEvents(instance, events), Times.Once);
        fixture.Mock<IInstanceClient>().VerifyNoOtherCalls();
        fixture.Mock<IAppEvents>().VerifyNoOtherCalls();
        fixture.Mock<IEventsClient>().VerifyNoOtherCalls();
    }

    [Fact]
    public async Task UpdateProcessAndDispatchEvents_EndEvent_confirmation_instance_updated_and_events_sent_to_storage()
    {
        // Arrange
        var services = new ServiceCollection();
        services.AddTransient<IEndEventEventHandler, EndEventEventHandler>();
        using var fixture = Fixture.Create(services: services);

        var (delegator, dispatcher) = (fixture.Delegator, fixture.Dispatcher);

        Instance instance = new Instance()
        {
            Id = $"{1234}/{Guid.NewGuid()}",
            Org = "ttd",
            AppId = "ttd/test-app",
            Process = new ProcessState()
            {
                CurrentTask = new() { Flow = 2, ElementId = "Task_2" },
            },
        };
        List<InstanceEvent> events = new List<InstanceEvent>()
        {
            new InstanceEvent()
            {
                EventType = InstanceEventType.process_EndEvent.ToString(),
                ProcessInfo = new()
                {
                    CurrentTask = new()
                    {
                        ElementId = "Task_2",
                        AltinnTaskType = "confirmation",
                        Name = "Bekreft",
                        Flow = 2,
                    },
                    EndEvent = "EndEvent",
                },
            },
        };

        var applicationMetadata = new ApplicationMetadata(instance.AppId)
        {
            CopyInstanceSettings = new CopyInstanceSettings { Enabled = true },
            DataTypes = new List<DataType>
            {
                new DataType
                {
                    Id = "data_type_1",
                    AppLogic = new ApplicationLogic { ClassRef = "App.Models.Skjema" },
                    TaskId = "First",
                },
            },
        };

        fixture.Mock<IAppMetadata>().Setup(x => x.GetApplicationMetadata()).ReturnsAsync(applicationMetadata);

        fixture.Mock<IInstanceClient>().Setup(i => i.UpdateProcessAndEvents(instance, events)).ReturnsAsync(instance);
        Dictionary<string, string> prefill = new Dictionary<string, string>();

        // Act
        await delegator.HandleEvents(instance, prefill, events);
        var result = await dispatcher.DispatchToStorage(instance, events);

        // Assert
        result.Should().Be(instance);
        fixture.Mock<IAppEvents>().Verify(a => a.OnEndAppEvent("EndEvent", instance), Times.Once);
        fixture.Mock<IInstanceClient>().Verify(i => i.UpdateProcessAndEvents(instance, events), Times.Once);
        fixture.Mock<IInstanceClient>().VerifyNoOtherCalls();
        fixture.Mock<IAppEvents>().VerifyNoOtherCalls();
        fixture.Mock<IEventsClient>().VerifyNoOtherCalls();
    }

    [Fact]
    public async Task UpdateProcessAndDispatchEvents_EndEvent_confirmation_instance_updated_and_dispatches_no_events_when_events_null()
    {
        // Arrange
        using var fixture = Fixture.Create();

        var (delegator, dispatcher) = (fixture.Delegator, fixture.Dispatcher);

        Instance instance = new Instance()
        {
            Id = Guid.NewGuid().ToString(),
            Org = "ttd",
            AppId = "ttd/test-app",
            Process = new ProcessState()
            {
                CurrentTask = new() { Flow = 2, ElementId = "Task_2" },
            },
        };
        List<InstanceEvent>? events = null;

        fixture.Mock<IInstanceClient>().Setup(i => i.UpdateProcessAndEvents(instance, new())).ReturnsAsync(instance);
        Dictionary<string, string> prefill = new Dictionary<string, string>();

        // Act
        await delegator.HandleEvents(instance, prefill, events);
        var result = await dispatcher.DispatchToStorage(instance, events);

        // Assert
        result.Should().Be(instance);
        fixture.Mock<IInstanceClient>().Verify(i => i.UpdateProcessAndEvents(instance, new()), Times.Once);
        fixture.Mock<IInstanceClient>().VerifyNoOtherCalls();
        fixture.Mock<IAppEvents>().VerifyNoOtherCalls();
        fixture.Mock<IEventsClient>().VerifyNoOtherCalls();
    }

    [Fact]
    public async Task RegisterEventWithEventsComponent_sends_movedTo_event_to_events_system_when_enabled_and_current_task_set()
    {
        // Arrange
        using var fixture = Fixture.Create(configureAppSettings: settings =>
            settings.RegisterEventsWithEventsComponent = true
        );

        var dispatcher = fixture.Dispatcher;

        Instance instance = new Instance()
        {
            Id = Guid.NewGuid().ToString(),
            Process = new() { CurrentTask = new() { ElementId = "Task_1" } },
        };

        // Act
        await dispatcher.RegisterEventWithEventsComponent(instance);

        // Assert
        fixture
            .Mock<IEventsClient>()
            .Verify(e => e.AddEvent("app.instance.process.movedTo.Task_1", instance), Times.Once);
        fixture.Mock<IInstanceClient>().VerifyNoOtherCalls();
        fixture.Mock<IAppEvents>().VerifyNoOtherCalls();
        fixture.Mock<IEventsClient>().VerifyNoOtherCalls();
    }

    [Fact]
    public async Task RegisterEventWithEventsComponent_sends_complete_event_to_events_system_when_currentTask_null_and_endevent_set()
    {
        // Arrange
        using var fixture = Fixture.Create(configureAppSettings: settings =>
            settings.RegisterEventsWithEventsComponent = true
        );

        var dispatcher = fixture.Dispatcher;

        Instance instance = new Instance()
        {
            Id = Guid.NewGuid().ToString(),
            Process = new() { CurrentTask = null, EndEvent = "EndEvent" },
        };

        // Act
        await dispatcher.RegisterEventWithEventsComponent(instance);

        // Assert
        fixture.Mock<IEventsClient>().Verify(e => e.AddEvent("app.instance.process.completed", instance), Times.Once);
        fixture.Mock<IInstanceClient>().VerifyNoOtherCalls();
        fixture.Mock<IAppEvents>().VerifyNoOtherCalls();
        fixture.Mock<IEventsClient>().VerifyNoOtherCalls();
    }

    [Fact]
    public async Task RegisterEventWithEventsComponent_sends_no_events_when_process_is_null()
    {
        // Arrange
        using var fixture = Fixture.Create(configureAppSettings: settings =>
            settings.RegisterEventsWithEventsComponent = true
        );

        var dispatcher = fixture.Dispatcher;

        Instance instance = new Instance() { Id = Guid.NewGuid().ToString(), Process = null };

        // Act
        await dispatcher.RegisterEventWithEventsComponent(instance);

        // Assert
        fixture.Mock<IInstanceClient>().VerifyNoOtherCalls();
        fixture.Mock<IAppEvents>().VerifyNoOtherCalls();
        fixture.Mock<IEventsClient>().VerifyNoOtherCalls();
    }

    [Fact]
    public async Task RegisterEventWithEventsComponent_sends_no_events_when_current_and_endevent_is_null()
    {
        // Arrange
        using var fixture = Fixture.Create(configureAppSettings: settings =>
            settings.RegisterEventsWithEventsComponent = true
        );

        var dispatcher = fixture.Dispatcher;

        Instance instance = new Instance() { Id = Guid.NewGuid().ToString(), Process = new() };

        // Act
        await dispatcher.RegisterEventWithEventsComponent(instance);

        // Assert
        fixture.Mock<IInstanceClient>().VerifyNoOtherCalls();
        fixture.Mock<IAppEvents>().VerifyNoOtherCalls();
        fixture.Mock<IEventsClient>().VerifyNoOtherCalls();
    }

    [Fact]
    public async Task RegisterEventWithEventsComponent_sends_no_events_when_registereventswitheventscomponent_false()
    {
        // Arrange
        using var fixture = Fixture.Create(configureAppSettings: settings =>
            settings.RegisterEventsWithEventsComponent = false
        );

        var dispatcher = fixture.Dispatcher;

        Instance instance = new Instance()
        {
            Id = Guid.NewGuid().ToString(),
            Process = new() { CurrentTask = new() { ElementId = "Task_1" } },
        };

        // Act
        await dispatcher.RegisterEventWithEventsComponent(instance);

        // Assert
        fixture.Mock<IInstanceClient>().VerifyNoOtherCalls();
        fixture.Mock<IAppEvents>().VerifyNoOtherCalls();
        fixture.Mock<IEventsClient>().VerifyNoOtherCalls();
    }
}
