#nullable disable
using Altinn.App.Core.Configuration;
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
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;

namespace Altinn.App.Core.Tests.Internal.Process;

public class ProcessEventHandlingTests
{
    private readonly List<IProcessTask> processTasks =
    [
        new Mock<DataProcessTask>().Object,
        new Mock<ConfirmationProcessTask>().Object,
        new Mock<FeedbackProcessTask>().Object,
        new Mock<NullTypeProcessTask>().Object,
    ];

    [Fact]
    public async Task UpdateProcessAndDispatchEvents_StartEvent_instance_updated_and_events_sent_to_storage_nothing_sent_to_ITask()
    {
        // Arrange
        var instanceService = new Mock<IInstanceClient>();
        var instanceEvent = new Mock<IInstanceEventClient>();
        var appEvents = new Mock<IAppEvents>();
        var eventsService = new Mock<IEventsClient>();
        var appSettings = Options.Create(new AppSettings());
        var logger = new NullLogger<ProcessEventDispatcher>();
        var startTaskEventHandler = new Mock<IStartTaskEventHandler>();
        var endTaskEventHandler = new Mock<IEndTaskEventHandler>();
        var abandonTaskEventHandler = new Mock<IAbandonTaskEventHandler>();
        var endEventHandler = new Mock<IEndEventEventHandler>();

        ProcessEventHandlingDelegator delegator = new ProcessEventHandlingDelegator(
            new NullLogger<ProcessEventHandlingDelegator>(),
            startTaskEventHandler.Object,
            endTaskEventHandler.Object,
            abandonTaskEventHandler.Object,
            endEventHandler.Object,
            processTasks
        );

        ProcessEventDispatcher dispatcher = new ProcessEventDispatcher(
            instanceService.Object,
            instanceEvent.Object,
            eventsService.Object,
            appSettings,
            logger
        );

        Instance instance = new Instance()
        {
            Id = Guid.NewGuid().ToString(),
            Org = "ttd",
            AppId = "ttd/test-app",
        };
        Instance updateInstanceResponse = new Instance()
        {
            Id = instance.Id,
            Org = "ttd",
            AppId = "ttd/test-app",
            Process = new ProcessState() { CurrentTask = new() { ElementId = "Task_1" } },
        };
        Instance getInstanceResponse = new Instance()
        {
            Id = instance.Id,
            Org = "ttd",
            AppId = "ttd/test-app",
            Process = new ProcessState()
            {
                CurrentTask = new() { ElementId = "Task_1", Flow = 2 },
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
        instanceService.Setup(i => i.UpdateProcess(instance)).ReturnsAsync(updateInstanceResponse);
        instanceService.Setup(i => i.GetInstance(updateInstanceResponse)).ReturnsAsync(getInstanceResponse);
        Dictionary<string, string> prefill = new Dictionary<string, string>();

        // Act
        await delegator.HandleEvents(instance, prefill, events);
        var result = await dispatcher.DispatchToStorage(instance, events);

        // Assert
        result.Should().Be(getInstanceResponse);
        instanceService.Verify(i => i.UpdateProcess(instance), Times.Once);
        instanceService.Verify(i => i.GetInstance(updateInstanceResponse), Times.Once);
        instanceEvent.Verify(p => p.SaveInstanceEvent(events[0], instance.Org, "test-app"), Times.Once);
        instanceService.VerifyNoOtherCalls();
        instanceEvent.VerifyNoOtherCalls();
        appEvents.VerifyNoOtherCalls();
        eventsService.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task UpdateProcessAndDispatchEvents_StartTask_instance_updated_and_events_sent_to_storage_nothing_sent_to_ITask_when_tasktype_missing()
    {
        // Arrange
        var instanceService = new Mock<IInstanceClient>();
        var instanceEvent = new Mock<IInstanceEventClient>();
        var appEvents = new Mock<IAppEvents>();
        var eventsService = new Mock<IEventsClient>();
        var appSettings = Options.Create(new AppSettings());
        var logger = new NullLogger<ProcessEventDispatcher>();
        var startTaskEventHandler = new Mock<IStartTaskEventHandler>();
        var endTaskEventHandler = new Mock<IEndTaskEventHandler>();
        var abandonTaskEventHandler = new Mock<IAbandonTaskEventHandler>();
        var endEventHandler = new Mock<IEndEventEventHandler>();

        ProcessEventHandlingDelegator delegator = new ProcessEventHandlingDelegator(
            new NullLogger<ProcessEventHandlingDelegator>(),
            startTaskEventHandler.Object,
            endTaskEventHandler.Object,
            abandonTaskEventHandler.Object,
            endEventHandler.Object,
            processTasks
        );

        ProcessEventDispatcher dispatcher = new ProcessEventDispatcher(
            instanceService.Object,
            instanceEvent.Object,
            eventsService.Object,
            appSettings,
            logger
        );

        Instance instance = new Instance()
        {
            Id = Guid.NewGuid().ToString(),
            Org = "ttd",
            AppId = "ttd/test-app",
        };
        Instance updateInstanceResponse = new Instance()
        {
            Id = instance.Id,
            Org = "ttd",
            AppId = "ttd/test-app",
            Process = new ProcessState() { CurrentTask = new() { ElementId = "Task_1" } },
        };
        Instance getInstanceResponse = new Instance()
        {
            Id = instance.Id,
            Process = new ProcessState()
            {
                CurrentTask = new() { ElementId = "Task_1", Flow = 2 },
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
        instanceService.Setup(i => i.UpdateProcess(instance)).ReturnsAsync(updateInstanceResponse);
        instanceService.Setup(i => i.GetInstance(updateInstanceResponse)).ReturnsAsync(getInstanceResponse);
        Dictionary<string, string> prefill = new Dictionary<string, string>();

        // Act
        await delegator.HandleEvents(instance, prefill, events);
        var result = await dispatcher.DispatchToStorage(instance, events);

        // Assert
        result.Should().Be(getInstanceResponse);
        instanceService.Verify(i => i.UpdateProcess(instance), Times.Once);
        instanceService.Verify(i => i.GetInstance(updateInstanceResponse), Times.Once);
        instanceEvent.Verify(p => p.SaveInstanceEvent(events[0], instance.Org, "test-app"), Times.Once);
        instanceService.VerifyNoOtherCalls();
        instanceEvent.VerifyNoOtherCalls();
        appEvents.VerifyNoOtherCalls();
        eventsService.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task UpdateProcessAndDispatchEvents_StartTask_data_instance_updated_and_events_sent_to_storage_and_trigger_ITask()
    {
        // Arrange
        var instanceService = new Mock<IInstanceClient>();
        var instanceEvent = new Mock<IInstanceEventClient>();
        var appEvents = new Mock<IAppEvents>();
        var eventsService = new Mock<IEventsClient>();
        var appSettings = Options.Create(new AppSettings());
        var logger = new NullLogger<ProcessEventDispatcher>();
        var startTaskEventHandler = new Mock<IStartTaskEventHandler>();
        var endTaskEventHandler = new Mock<IEndTaskEventHandler>();
        var abandonTaskEventHandler = new Mock<IAbandonTaskEventHandler>();
        var endEventHandler = new Mock<IEndEventEventHandler>();

        ProcessEventHandlingDelegator delegator = new ProcessEventHandlingDelegator(
            new NullLogger<ProcessEventHandlingDelegator>(),
            startTaskEventHandler.Object,
            endTaskEventHandler.Object,
            abandonTaskEventHandler.Object,
            endEventHandler.Object,
            processTasks
        );

        ProcessEventDispatcher dispatcher = new ProcessEventDispatcher(
            instanceService.Object,
            instanceEvent.Object,
            eventsService.Object,
            appSettings,
            logger
        );

        Instance instance = new Instance()
        {
            Id = Guid.NewGuid().ToString(),
            Org = "ttd",
            AppId = "ttd/test-app",
        };
        Instance updateInstanceResponse = new Instance()
        {
            Id = instance.Id,
            Org = "ttd",
            AppId = "ttd/test-app",
            Process = new ProcessState() { CurrentTask = new() { ElementId = "Task_1" } },
        };
        Instance getInstanceResponse = new Instance()
        {
            Id = instance.Id,
            Org = "ttd",
            AppId = "ttd/test-app",
            Process = new ProcessState()
            {
                CurrentTask = new() { ElementId = "Task_1", Flow = 2 },
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
                        Flow = 2,
                    },
                },
            },
        };
        instanceService.Setup(i => i.UpdateProcess(instance)).ReturnsAsync(updateInstanceResponse);
        instanceService.Setup(i => i.GetInstance(updateInstanceResponse)).ReturnsAsync(getInstanceResponse);
        Dictionary<string, string> prefill = new Dictionary<string, string>();

        // Act
        await delegator.HandleEvents(instance, prefill, events);
        var result = await dispatcher.DispatchToStorage(instance, events);

        // Assert
        result.Should().Be(getInstanceResponse);
        instanceService.Verify(i => i.UpdateProcess(instance), Times.Once);
        instanceService.Verify(i => i.GetInstance(updateInstanceResponse), Times.Once);
        instanceEvent.Verify(p => p.SaveInstanceEvent(events[0], instance.Org, "test-app"), Times.Once);
        instanceService.VerifyNoOtherCalls();
        instanceEvent.VerifyNoOtherCalls();
        appEvents.VerifyNoOtherCalls();
        eventsService.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task UpdateProcessAndDispatchEvents_EndTask_confirmation_instance_updated_and_events_sent_to_storage_and_trigger_ITask()
    {
        // Arrange
        var instanceService = new Mock<IInstanceClient>();
        var instanceEvent = new Mock<IInstanceEventClient>();
        var appEvents = new Mock<IAppEvents>();
        var eventsService = new Mock<IEventsClient>();
        var appSettings = Options.Create(new AppSettings());
        var logger = new NullLogger<ProcessEventDispatcher>();
        var startTaskEventHandler = new Mock<IStartTaskEventHandler>();
        var endTaskEventHandler = new Mock<IEndTaskEventHandler>();
        var abandonTaskEventHandler = new Mock<IAbandonTaskEventHandler>();
        var endEventHandler = new Mock<IEndEventEventHandler>();

        ProcessEventHandlingDelegator delegator = new ProcessEventHandlingDelegator(
            new NullLogger<ProcessEventHandlingDelegator>(),
            startTaskEventHandler.Object,
            endTaskEventHandler.Object,
            abandonTaskEventHandler.Object,
            endEventHandler.Object,
            processTasks
        );

        ProcessEventDispatcher dispatcher = new ProcessEventDispatcher(
            instanceService.Object,
            instanceEvent.Object,
            eventsService.Object,
            appSettings,
            logger
        );

        Instance instance = new Instance()
        {
            Id = Guid.NewGuid().ToString(),
            Org = "ttd",
            AppId = "ttd/test-app",
        };
        Instance updateInstanceResponse = new Instance()
        {
            Id = instance.Id,
            Org = "ttd",
            AppId = "ttd/test-app",
            Process = new ProcessState() { CurrentTask = new() { ElementId = "Task_2" } },
        };
        Instance getInstanceResponse = new Instance()
        {
            Id = instance.Id,
            Org = "ttd",
            AppId = "ttd/test-app",
            Process = new ProcessState()
            {
                CurrentTask = new() { ElementId = "Task_2", Flow = 3 },
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
        instanceService.Setup(i => i.UpdateProcess(instance)).ReturnsAsync(updateInstanceResponse);
        instanceService.Setup(i => i.GetInstance(updateInstanceResponse)).ReturnsAsync(getInstanceResponse);
        Dictionary<string, string> prefill = new Dictionary<string, string>();

        // Act
        await delegator.HandleEvents(instance, prefill, events);
        var result = await dispatcher.DispatchToStorage(instance, events);

        // Assert
        result.Should().Be(getInstanceResponse);
        instanceService.Verify(i => i.UpdateProcess(instance), Times.Once);
        instanceService.Verify(i => i.GetInstance(updateInstanceResponse), Times.Once);
        instanceEvent.Verify(p => p.SaveInstanceEvent(events[0], instance.Org, "test-app"), Times.Once);
        instanceService.VerifyNoOtherCalls();
        instanceEvent.VerifyNoOtherCalls();
        appEvents.VerifyNoOtherCalls();
        eventsService.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task UpdateProcessAndDispatchEvents_AbandonTask_feedback_instance_updated_and_events_sent_to_storage_and_trigger_ITask()
    {
        // Arrange
        var instanceService = new Mock<IInstanceClient>();
        var instanceEvent = new Mock<IInstanceEventClient>();
        var appEvents = new Mock<IAppEvents>();
        var eventsService = new Mock<IEventsClient>();
        var appSettings = Options.Create(new AppSettings());
        var logger = new NullLogger<ProcessEventDispatcher>();
        var startTaskEventHandler = new Mock<IStartTaskEventHandler>();
        var endTaskEventHandler = new Mock<IEndTaskEventHandler>();
        var abandonTaskEventHandler = new Mock<IAbandonTaskEventHandler>();
        var endEventHandler = new Mock<IEndEventEventHandler>();

        ProcessEventHandlingDelegator delegator = new ProcessEventHandlingDelegator(
            new NullLogger<ProcessEventHandlingDelegator>(),
            startTaskEventHandler.Object,
            endTaskEventHandler.Object,
            abandonTaskEventHandler.Object,
            endEventHandler.Object,
            processTasks
        );

        ProcessEventDispatcher dispatcher = new ProcessEventDispatcher(
            instanceService.Object,
            instanceEvent.Object,
            eventsService.Object,
            appSettings,
            logger
        );

        Instance instance = new Instance()
        {
            Id = Guid.NewGuid().ToString(),
            Org = "ttd",
            AppId = "ttd/test-app",
        };
        Instance updateInstanceResponse = new Instance()
        {
            Id = instance.Id,
            Org = "ttd",
            AppId = "ttd/test-app",
            Process = new ProcessState() { CurrentTask = new() { ElementId = "Task_2" } },
        };
        Instance getInstanceResponse = new Instance()
        {
            Id = instance.Id,
            Org = "ttd",
            AppId = "ttd/test-app",
            Process = new ProcessState()
            {
                CurrentTask = new() { ElementId = "Task_2", Flow = 4 },
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
                        Flow = 4,
                    },
                },
            },
        };
        instanceService.Setup(i => i.UpdateProcess(instance)).ReturnsAsync(updateInstanceResponse);
        instanceService.Setup(i => i.GetInstance(updateInstanceResponse)).ReturnsAsync(getInstanceResponse);
        Dictionary<string, string> prefill = new Dictionary<string, string>();

        // Act
        await delegator.HandleEvents(instance, prefill, events);
        var result = await dispatcher.DispatchToStorage(instance, events);

        // Assert
        result.Should().Be(getInstanceResponse);
        instanceService.Verify(i => i.UpdateProcess(instance), Times.Once);
        instanceService.Verify(i => i.GetInstance(updateInstanceResponse), Times.Once);
        instanceEvent.Verify(p => p.SaveInstanceEvent(events[0], instance.Org, "test-app"), Times.Once);
        instanceService.VerifyNoOtherCalls();
        instanceEvent.VerifyNoOtherCalls();
        appEvents.VerifyNoOtherCalls();
        eventsService.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task UpdateProcessAndDispatchEvents_EndEvent_confirmation_instance_updated_and_events_sent_to_storage_and_trigger_ITask()
    {
        // Arrange
        var instanceService = new Mock<IInstanceClient>();
        var instanceEvent = new Mock<IInstanceEventClient>();
        var appMetadata = new Mock<IAppMetadata>();
        var appEvents = new Mock<IAppEvents>();
        var eventsService = new Mock<IEventsClient>();
        var appSettings = Options.Create(new AppSettings());
        var logger = new NullLogger<ProcessEventDispatcher>();
        var startTaskEventHandler = new Mock<IStartTaskEventHandler>();
        var endTaskEventHandler = new Mock<IEndTaskEventHandler>();
        var abandonTaskEventHandler = new Mock<IAbandonTaskEventHandler>();
        var endEventHandler = new EndEventEventHandler(appEvents.Object, instanceService.Object, appMetadata.Object);

        ProcessEventHandlingDelegator delegator = new ProcessEventHandlingDelegator(
            new NullLogger<ProcessEventHandlingDelegator>(),
            startTaskEventHandler.Object,
            endTaskEventHandler.Object,
            abandonTaskEventHandler.Object,
            endEventHandler,
            processTasks
        );

        ProcessEventDispatcher dispatcher = new ProcessEventDispatcher(
            instanceService.Object,
            instanceEvent.Object,
            eventsService.Object,
            appSettings,
            logger
        );

        Instance instance = new Instance()
        {
            Id = $"{1234}/{Guid.NewGuid()}",
            Org = "ttd",
            AppId = "ttd/test-app",
        };
        Instance updateInstanceResponse = new Instance()
        {
            Id = instance.Id,
            Org = "ttd",
            AppId = "ttd/test-app",
            Process = new ProcessState() { CurrentTask = new() { ElementId = "Task_2" } },
        };
        Instance getInstanceResponse = new Instance()
        {
            Id = instance.Id,
            Process = new ProcessState()
            {
                CurrentTask = new() { ElementId = "Task_2", Flow = 3 },
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

        appMetadata.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(applicationMetadata);

        instanceService.Setup(i => i.UpdateProcess(instance)).ReturnsAsync(updateInstanceResponse);
        instanceService.Setup(i => i.GetInstance(updateInstanceResponse)).ReturnsAsync(getInstanceResponse);
        Dictionary<string, string> prefill = new Dictionary<string, string>();

        // Act
        await delegator.HandleEvents(instance, prefill, events);
        var result = await dispatcher.DispatchToStorage(instance, events);

        // Assert
        result.Should().Be(getInstanceResponse);
        appEvents.Verify(a => a.OnEndAppEvent("EndEvent", instance), Times.Once);
        instanceService.Verify(i => i.UpdateProcess(instance), Times.Once);
        instanceService.Verify(i => i.GetInstance(updateInstanceResponse), Times.Once);
        instanceEvent.Verify(p => p.SaveInstanceEvent(events[0], instance.Org, "test-app"), Times.Once);
        instanceService.VerifyNoOtherCalls();
        instanceEvent.VerifyNoOtherCalls();
        appEvents.VerifyNoOtherCalls();
        eventsService.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task UpdateProcessAndDispatchEvents_EndEvent_confirmation_instance_updated_and_dispatches_no_events_when_events_null()
    {
        // Arrange
        var instanceService = new Mock<IInstanceClient>();
        var instanceEvent = new Mock<IInstanceEventClient>();
        var appEvents = new Mock<IAppEvents>();
        var eventsService = new Mock<IEventsClient>();
        var appSettings = Options.Create(new AppSettings());
        var logger = new NullLogger<ProcessEventDispatcher>();
        var startTaskEventHandler = new Mock<IStartTaskEventHandler>();
        var endTaskEventHandler = new Mock<IEndTaskEventHandler>();
        var abandonTaskEventHandler = new Mock<IAbandonTaskEventHandler>();
        var endEventHandler = new Mock<IEndEventEventHandler>();

        ProcessEventHandlingDelegator delegator = new ProcessEventHandlingDelegator(
            new NullLogger<ProcessEventHandlingDelegator>(),
            startTaskEventHandler.Object,
            endTaskEventHandler.Object,
            abandonTaskEventHandler.Object,
            endEventHandler.Object,
            processTasks
        );

        ProcessEventDispatcher dispatcher = new ProcessEventDispatcher(
            instanceService.Object,
            instanceEvent.Object,
            eventsService.Object,
            appSettings,
            logger
        );

        Instance instance = new Instance()
        {
            Id = Guid.NewGuid().ToString(),
            Org = "ttd",
            AppId = "ttd/test-app",
        };
        Instance updateInstanceResponse = new Instance()
        {
            Id = instance.Id,
            Org = "ttd",
            AppId = "ttd/test-app",
            Process = new ProcessState() { CurrentTask = new() { ElementId = "Task_2" } },
        };
        Instance getInstanceResponse = new Instance()
        {
            Id = instance.Id,
            Process = new ProcessState()
            {
                CurrentTask = new() { ElementId = "Task_2", Flow = 3 },
            },
        };
        List<InstanceEvent> events = null;
        instanceService.Setup(i => i.UpdateProcess(instance)).ReturnsAsync(updateInstanceResponse);
        instanceService.Setup(i => i.GetInstance(updateInstanceResponse)).ReturnsAsync(getInstanceResponse);
        Dictionary<string, string> prefill = new Dictionary<string, string>();

        // Act
        await delegator.HandleEvents(instance, prefill, events);
        var result = await dispatcher.DispatchToStorage(instance, events);

        // Assert
        result.Should().Be(getInstanceResponse);
        instanceService.Verify(i => i.UpdateProcess(instance), Times.Once);
        instanceService.Verify(i => i.GetInstance(updateInstanceResponse), Times.Once);
        instanceService.VerifyNoOtherCalls();
        instanceEvent.VerifyNoOtherCalls();
        appEvents.VerifyNoOtherCalls();
        eventsService.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task RegisterEventWithEventsComponent_sends_movedTo_event_to_events_system_when_enabled_and_current_task_set()
    {
        // Arrange
        var instanceService = new Mock<IInstanceClient>();
        var instanceEvent = new Mock<IInstanceEventClient>();
        var appEvents = new Mock<IAppEvents>();
        var eventsService = new Mock<IEventsClient>();
        var appSettings = Options.Create(new AppSettings() { RegisterEventsWithEventsComponent = true });
        var logger = new NullLogger<ProcessEventDispatcher>();

        ProcessEventDispatcher dispatcher = new ProcessEventDispatcher(
            instanceService.Object,
            instanceEvent.Object,
            eventsService.Object,
            appSettings,
            logger
        );

        Instance instance = new Instance()
        {
            Id = Guid.NewGuid().ToString(),
            Process = new() { CurrentTask = new() { ElementId = "Task_1" } },
        };

        // Act
        await dispatcher.RegisterEventWithEventsComponent(instance);

        // Assert
        eventsService.Verify(e => e.AddEvent("app.instance.process.movedTo.Task_1", instance), Times.Once);
        instanceService.VerifyNoOtherCalls();
        instanceEvent.VerifyNoOtherCalls();
        appEvents.VerifyNoOtherCalls();
        eventsService.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task RegisterEventWithEventsComponent_sends_complete_event_to_events_system_when_currentTask_null_and_endevent_set()
    {
        // Arrange
        var instanceService = new Mock<IInstanceClient>();
        var instanceEvent = new Mock<IInstanceEventClient>();
        var appEvents = new Mock<IAppEvents>();
        var eventsService = new Mock<IEventsClient>();
        var appSettings = Options.Create(new AppSettings() { RegisterEventsWithEventsComponent = true });
        var logger = new NullLogger<ProcessEventDispatcher>();

        ProcessEventDispatcher dispatcher = new ProcessEventDispatcher(
            instanceService.Object,
            instanceEvent.Object,
            eventsService.Object,
            appSettings,
            logger
        );

        Instance instance = new Instance()
        {
            Id = Guid.NewGuid().ToString(),
            Process = new() { CurrentTask = null, EndEvent = "EndEvent" },
        };

        // Act
        await dispatcher.RegisterEventWithEventsComponent(instance);

        // Assert
        eventsService.Verify(e => e.AddEvent("app.instance.process.completed", instance), Times.Once);
        instanceService.VerifyNoOtherCalls();
        instanceEvent.VerifyNoOtherCalls();
        appEvents.VerifyNoOtherCalls();
        eventsService.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task RegisterEventWithEventsComponent_sends_no_events_when_process_is_null()
    {
        // Arrange
        var instanceService = new Mock<IInstanceClient>();
        var instanceEvent = new Mock<IInstanceEventClient>();
        var appEvents = new Mock<IAppEvents>();
        var eventsService = new Mock<IEventsClient>();
        var appSettings = Options.Create(new AppSettings() { RegisterEventsWithEventsComponent = true });
        var logger = new NullLogger<ProcessEventDispatcher>();

        ProcessEventDispatcher dispatcher = new ProcessEventDispatcher(
            instanceService.Object,
            instanceEvent.Object,
            eventsService.Object,
            appSettings,
            logger
        );

        Instance instance = new Instance() { Id = Guid.NewGuid().ToString(), Process = null };

        // Act
        await dispatcher.RegisterEventWithEventsComponent(instance);

        // Assert
        instanceService.VerifyNoOtherCalls();
        instanceEvent.VerifyNoOtherCalls();
        appEvents.VerifyNoOtherCalls();
        eventsService.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task RegisterEventWithEventsComponent_sends_no_events_when_current_and_endevent_is_null()
    {
        // Arrange
        var instanceService = new Mock<IInstanceClient>();
        var instanceEvent = new Mock<IInstanceEventClient>();
        var appEvents = new Mock<IAppEvents>();
        var eventsService = new Mock<IEventsClient>();
        var appSettings = Options.Create(new AppSettings() { RegisterEventsWithEventsComponent = true });
        var logger = new NullLogger<ProcessEventDispatcher>();

        ProcessEventDispatcher dispatcher = new ProcessEventDispatcher(
            instanceService.Object,
            instanceEvent.Object,
            eventsService.Object,
            appSettings,
            logger
        );

        Instance instance = new Instance() { Id = Guid.NewGuid().ToString(), Process = new() };

        // Act
        await dispatcher.RegisterEventWithEventsComponent(instance);

        // Assert
        instanceService.VerifyNoOtherCalls();
        instanceEvent.VerifyNoOtherCalls();
        appEvents.VerifyNoOtherCalls();
        eventsService.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task RegisterEventWithEventsComponent_sends_no_events_when_registereventswitheventscomponent_false()
    {
        // Arrange
        var instanceService = new Mock<IInstanceClient>();
        var instanceEvent = new Mock<IInstanceEventClient>();
        var appEvents = new Mock<IAppEvents>();
        var eventsService = new Mock<IEventsClient>();
        var appSettings = Options.Create(new AppSettings() { RegisterEventsWithEventsComponent = false });
        var logger = new NullLogger<ProcessEventDispatcher>();

        ProcessEventDispatcher dispatcher = new ProcessEventDispatcher(
            instanceService.Object,
            instanceEvent.Object,
            eventsService.Object,
            appSettings,
            logger
        );

        Instance instance = new Instance()
        {
            Id = Guid.NewGuid().ToString(),
            Process = new() { CurrentTask = new() { ElementId = "Task_1" } },
        };

        // Act
        await dispatcher.RegisterEventWithEventsComponent(instance);

        // Assert
        instanceService.VerifyNoOtherCalls();
        instanceEvent.VerifyNoOtherCalls();
        appEvents.VerifyNoOtherCalls();
        eventsService.VerifyNoOtherCalls();
    }
}
