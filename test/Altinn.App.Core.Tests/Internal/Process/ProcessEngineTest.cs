#nullable enable
using System.Security.Claims;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Interface;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Models.Process;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using AltinnCore.Authentication.Constants;
using FluentAssertions;
using Moq;
using Newtonsoft.Json;
using Xunit;

namespace Altinn.App.Core.Tests.Internal.Process;

public class ProcessEngineTest : IDisposable
{
    private Mock<IProcessReader> _processReaderMock;
    private readonly Mock<IProfile> _profileMock;
    private readonly Mock<IProcessNavigator> _processNavigatorMock;
    private readonly Mock<IProcessEventDispatcher> _processEventDispatcherMock;

    public ProcessEngineTest()
    {
        _processReaderMock = new();
        _profileMock = new();
        _processNavigatorMock = new();
        _processEventDispatcherMock = new();
    }

    [Fact]
    public async Task StartProcess_returns_unsuccessful_when_process_already_started()
    {
        IProcessEngine processEngine = GetProcessEngine();
        Instance instance = new Instance() { Process = new ProcessState() { CurrentTask = new ProcessElementInfo() { ElementId = "Task_1" } } };
        ProcessStartRequest processStartRequest = new ProcessStartRequest() { Instance = instance };
        ProcessChangeResult result = await processEngine.StartProcess(processStartRequest);
        result.Success.Should().BeFalse();
        result.ErrorMessage.Should().Be("Process is already started. Use next.");
        result.ErrorType.Should().Be(ProcessErrorType.Conflict);
    }

    [Fact]
    public async Task StartProcess_returns_unsuccessful_when_no_matching_startevent_found()
    {
        Mock<IProcessReader> processReaderMock = new();
        processReaderMock.Setup(r => r.GetStartEventIds()).Returns(new List<string>() { "StartEvent_1" });
        IProcessEngine processEngine = GetProcessEngine(processReaderMock);
        Instance instance = new Instance();
        ProcessStartRequest processStartRequest = new ProcessStartRequest() { Instance = instance, StartEventId = "NotTheStartEventYouAreLookingFor" };
        ProcessChangeResult result = await processEngine.StartProcess(processStartRequest);
        _processReaderMock.Verify(r => r.GetStartEventIds(), Times.Once);
        result.Success.Should().BeFalse();
        result.ErrorMessage.Should().Be("No matching startevent");
        result.ErrorType.Should().Be(ProcessErrorType.Conflict);
    }

    [Fact]
    public async Task StartProcess_starts_process_and_moves_to_first_task_without_event_dispatch_when_dryrun()
    {
        IProcessEngine processEngine = GetProcessEngine();
        Instance instance = new Instance()
        {
            InstanceOwner = new InstanceOwner()
            {
                PartyId = "1337"
            }
        };
        ClaimsPrincipal user = new(new ClaimsIdentity(new List<Claim>()
        {
            new(AltinnCoreClaimTypes.UserId, "1337"),
            new(AltinnCoreClaimTypes.AuthenticationLevel, "2"),
            new(AltinnCoreClaimTypes.Org, "tdd"),
        }));
        ProcessStartRequest processStartRequest = new ProcessStartRequest() { Instance = instance, User = user, Dryrun = true };
        ProcessChangeResult result = await processEngine.StartProcess(processStartRequest);
        _processReaderMock.Verify(r => r.GetStartEventIds(), Times.Once);
        _processReaderMock.Verify(r => r.IsProcessTask("StartEvent_1"), Times.Once);
        _processReaderMock.Verify(r => r.IsEndEvent("Task_1"), Times.Once);
        _processReaderMock.Verify(r => r.IsProcessTask("Task_1"), Times.Once);
        _processNavigatorMock.Verify(n => n.GetNextTask(It.IsAny<Instance>(), "StartEvent_1", null), Times.Once);
        result.Success.Should().BeTrue();
    }

    [Fact]
    public async Task StartProcess_starts_process_and_moves_to_first_task()
    {
        IProcessEngine processEngine = GetProcessEngine();
        Instance instance = new Instance()
        {
            InstanceOwner = new InstanceOwner()
            {
                PartyId = "1337"
            }
        };
        ClaimsPrincipal user = new(new ClaimsIdentity(new List<Claim>()
        {
            new(AltinnCoreClaimTypes.UserId, "1337"),
            new(AltinnCoreClaimTypes.AuthenticationLevel, "2"),
            new(AltinnCoreClaimTypes.Org, "tdd"),
        }));
        ProcessStartRequest processStartRequest = new ProcessStartRequest() { Instance = instance, User = user };
        ProcessChangeResult result = await processEngine.StartProcess(processStartRequest);
        _processReaderMock.Verify(r => r.GetStartEventIds(), Times.Once);
        _processReaderMock.Verify(r => r.IsProcessTask("StartEvent_1"), Times.Once);
        _processReaderMock.Verify(r => r.IsEndEvent("Task_1"), Times.Once);
        _processReaderMock.Verify(r => r.IsProcessTask("Task_1"), Times.Once);
        _processNavigatorMock.Verify(n => n.GetNextTask(It.IsAny<Instance>(), "StartEvent_1", null), Times.Once);
        var expectedInstance = new Instance()
        {
            InstanceOwner = new InstanceOwner()
            {
                PartyId = "1337"
            },
            Process = new ProcessState()
            {
                CurrentTask = new ProcessElementInfo()
                {
                    ElementId = "Task_1",
                    Flow = 2,
                    AltinnTaskType = "data",
                    Name = "Utfylling"
                },
                StartEvent = "StartEvent_1"
            }
        };
        var expectedInstanceEvents = new List<InstanceEvent>()
        {
            new()
            {
                EventType = InstanceEventType.process_StartEvent.ToString(),
                InstanceOwnerPartyId = "1337",
                User = new()
                {
                    UserId = 1337,
                    OrgId = "tdd",
                    AuthenticationLevel = 2
                },
                ProcessInfo = new()
                {
                    StartEvent = "StartEvent_1",
                    CurrentTask = new()
                    {
                        ElementId = "StartEvent_1",
                        Flow = 1,
                        Validated = new()
                        {
                            CanCompleteTask = false
                        }
                    }
                }
            },

            new()
            {
                EventType = InstanceEventType.process_StartTask.ToString(),
                InstanceOwnerPartyId = "1337",
                User = new()
                {
                    UserId = 1337,
                    OrgId = "tdd",
                    AuthenticationLevel = 2,
                },
                ProcessInfo = new()
                {
                    StartEvent = "StartEvent_1",
                    CurrentTask = new()
                    {
                        ElementId = "Task_1",
                        Name = "Utfylling",
                        AltinnTaskType = "data",
                        Flow = 2,
                        Validated = new()
                        {
                            CanCompleteTask = false
                        }
                    }
                }
            }
        };
        _processEventDispatcherMock.Verify(d => d.UpdateProcessAndDispatchEvents(
            It.Is<Instance>(i => CompareInstance(expectedInstance, i)),
            null,
            It.Is<List<InstanceEvent>>(l => CompareInstanceEvents(l, expectedInstanceEvents))));
        result.Success.Should().BeTrue();
    }

    [Fact]
    public async Task StartProcess_starts_process_and_moves_to_first_task_with_prefill()
    {
        IProcessEngine processEngine = GetProcessEngine();
        Instance instance = new Instance()
        {
            InstanceOwner = new InstanceOwner()
            {
                PartyId = "1337"
            }
        };
        ClaimsPrincipal user = new(new ClaimsIdentity(new List<Claim>()
        {
            new(AltinnCoreClaimTypes.UserId, "1337"),
            new(AltinnCoreClaimTypes.AuthenticationLevel, "2"),
            new(AltinnCoreClaimTypes.Org, "tdd"),
        }));
        var prefill = new Dictionary<string, string>() { { "test", "test" } };
        ProcessStartRequest processStartRequest = new ProcessStartRequest() { Instance = instance, User = user, Prefill = prefill };
        ProcessChangeResult result = await processEngine.StartProcess(processStartRequest);
        _processReaderMock.Verify(r => r.GetStartEventIds(), Times.Once);
        _processReaderMock.Verify(r => r.IsProcessTask("StartEvent_1"), Times.Once);
        _processReaderMock.Verify(r => r.IsEndEvent("Task_1"), Times.Once);
        _processReaderMock.Verify(r => r.IsProcessTask("Task_1"), Times.Once);
        _processNavigatorMock.Verify(n => n.GetNextTask(It.IsAny<Instance>(), "StartEvent_1", null), Times.Once);
        var expectedInstance = new Instance()
        {
            InstanceOwner = new InstanceOwner()
            {
                PartyId = "1337"
            },
            Process = new ProcessState()
            {
                CurrentTask = new ProcessElementInfo()
                {
                    ElementId = "Task_1",
                    Flow = 2,
                    AltinnTaskType = "data",
                    Name = "Utfylling"
                },
                StartEvent = "StartEvent_1"
            }
        };
        var expectedInstanceEvents = new List<InstanceEvent>()
        {
            new()
            {
                EventType = InstanceEventType.process_StartEvent.ToString(),
                InstanceOwnerPartyId = "1337",
                User = new()
                {
                    UserId = 1337,
                    OrgId = "tdd",
                    AuthenticationLevel = 2
                },
                ProcessInfo = new()
                {
                    StartEvent = "StartEvent_1",
                    CurrentTask = new()
                    {
                        ElementId = "StartEvent_1",
                        Flow = 1,
                        Validated = new()
                        {
                            CanCompleteTask = false
                        }
                    }
                }
            },

            new()
            {
                EventType = InstanceEventType.process_StartTask.ToString(),
                InstanceOwnerPartyId = "1337",
                User = new()
                {
                    UserId = 1337,
                    OrgId = "tdd",
                    AuthenticationLevel = 2,
                },
                ProcessInfo = new()
                {
                    StartEvent = "StartEvent_1",
                    CurrentTask = new()
                    {
                        ElementId = "Task_1",
                        Name = "Utfylling",
                        AltinnTaskType = "data",
                        Flow = 2,
                        Validated = new()
                        {
                            CanCompleteTask = false
                        }
                    }
                }
            }
        };
        _processEventDispatcherMock.Verify(d => d.UpdateProcessAndDispatchEvents(
            It.Is<Instance>(i => CompareInstance(expectedInstance, i)),
            prefill,
            It.Is<List<InstanceEvent>>(l => CompareInstanceEvents(l, expectedInstanceEvents))));
        result.Success.Should().BeTrue();
    }

    [Fact]
    public async Task Next_returns_unsuccessful_when_process_null()
    {
        IProcessEngine processEngine = GetProcessEngine();
        Instance instance = new Instance() { Process = null };
        ProcessNextRequest processNextRequest = new ProcessNextRequest() { Instance = instance };
        ProcessChangeResult result = await processEngine.Next(processNextRequest);
        result.Success.Should().BeFalse();
        result.ErrorMessage.Should().Be("Instance does not have current task information!");
        result.ErrorType.Should().Be(ProcessErrorType.Conflict);
    }

    [Fact]
    public async Task Next_returns_unsuccessful_when_process_currenttask_null()
    {
        IProcessEngine processEngine = GetProcessEngine();
        Instance instance = new Instance() { Process = new ProcessState() { CurrentTask = null } };
        ProcessNextRequest processNextRequest = new ProcessNextRequest() { Instance = instance };
        ProcessChangeResult result = await processEngine.Next(processNextRequest);
        result.Success.Should().BeFalse();
        result.ErrorMessage.Should().Be("Instance does not have current task information!");
        result.ErrorType.Should().Be(ProcessErrorType.Conflict);
    }

    [Fact]
    public async Task Next_moves_instance_to_next_task_and_produces_instanceevents()
    {
        var expectedInstance = new Instance()
        {
            InstanceOwner = new InstanceOwner()
            {
                PartyId = "1337"
            },
            Process = new ProcessState()
            {
                CurrentTask = new ProcessElementInfo()
                {
                    ElementId = "Task_2",
                    Flow = 3,
                    AltinnTaskType = "confirmation",
                    Name = "Bekreft"
                },
                StartEvent = "StartEvent_1"
            }
        };
        IProcessEngine processEngine = GetProcessEngine(null, expectedInstance);
        Instance instance = new Instance()
        {
            InstanceOwner = new()
            {
                PartyId = "1337"
            },
            Process = new ProcessState()
            {
                StartEvent = "StartEvent_1",
                CurrentTask = new()
                {
                    ElementId = "Task_1",
                    AltinnTaskType = "data",
                    Flow = 2,
                    Validated = new()
                    {
                        CanCompleteTask = true
                    }
                }
            }
        };
        ProcessState originalProcessState = instance.Process.Copy();
        ClaimsPrincipal user = new(new ClaimsIdentity(new List<Claim>()
        {
            new(AltinnCoreClaimTypes.UserId, "1337"),
            new(AltinnCoreClaimTypes.AuthenticationLevel, "2"),
            new(AltinnCoreClaimTypes.Org, "tdd"),
        }));
        ProcessNextRequest processNextRequest = new ProcessNextRequest() { Instance = instance, User = user };
        ProcessChangeResult result = await processEngine.Next(processNextRequest);
        _processReaderMock.Verify(r => r.IsProcessTask("Task_1"), Times.Once);
        _processReaderMock.Verify(r => r.IsEndEvent("Task_2"), Times.Once);
        _processReaderMock.Verify(r => r.IsProcessTask("Task_2"), Times.Once);
        _processNavigatorMock.Verify(n => n.GetNextTask(It.IsAny<Instance>(), "Task_1", null), Times.Once);

        var expectedInstanceEvents = new List<InstanceEvent>()
        {
            new()
            {
                EventType = InstanceEventType.process_EndTask.ToString(),
                InstanceOwnerPartyId = "1337",
                User = new()
                {
                    UserId = 1337,
                    OrgId = "tdd",
                    AuthenticationLevel = 2
                },
                ProcessInfo = new()
                {
                    StartEvent = "StartEvent_1",
                    CurrentTask = new()
                    {
                        ElementId = "Task_1",
                        Flow = 2,
                        AltinnTaskType = "data",
                        Validated = new()
                        {
                            CanCompleteTask = true
                        }
                    }
                }
            },

            new()
            {
                EventType = InstanceEventType.process_StartTask.ToString(),
                InstanceOwnerPartyId = "1337",
                User = new()
                {
                    UserId = 1337,
                    OrgId = "tdd",
                    AuthenticationLevel = 2,
                },
                ProcessInfo = new()
                {
                    StartEvent = "StartEvent_1",
                    CurrentTask = new()
                    {
                        ElementId = "Task_2",
                        Name = "Bekreft",
                        AltinnTaskType = "confirmation",
                        Flow = 3
                    }
                }
            }
        };
        _processEventDispatcherMock.Verify(d => d.UpdateProcessAndDispatchEvents(
            It.Is<Instance>(i => CompareInstance(expectedInstance, i)),
            It.IsAny<Dictionary<string, string>?>(),
            It.Is<List<InstanceEvent>>(l => CompareInstanceEvents(expectedInstanceEvents, l))));
        _processEventDispatcherMock.Verify(d => d.RegisterEventWithEventsComponent(It.Is<Instance>(i => CompareInstance(expectedInstance, i))));
        result.Success.Should().BeTrue();
        result.ProcessStateChange.Should().BeEquivalentTo(
            new ProcessStateChange()
            {
                Events = expectedInstanceEvents,
                NewProcessState = expectedInstance.Process,
                OldProcessState = originalProcessState
            });
    }

    [Fact]
    public async Task Next_moves_instance_to_next_task_and_produces_abandon_instanceevent_when_action_reject()
    {
        var expectedInstance = new Instance()
        {
            InstanceOwner = new InstanceOwner()
            {
                PartyId = "1337"
            },
            Process = new ProcessState()
            {
                CurrentTask = new ProcessElementInfo()
                {
                    ElementId = "Task_2",
                    Flow = 3,
                    AltinnTaskType = "confirmation",
                    Name = "Bekreft"
                },
                StartEvent = "StartEvent_1"
            }
        };
        IProcessEngine processEngine = GetProcessEngine(null, expectedInstance);
        Instance instance = new Instance()
        {
            InstanceOwner = new()
            {
                PartyId = "1337"
            },
            Process = new ProcessState()
            {
                StartEvent = "StartEvent_1",
                CurrentTask = new()
                {
                    ElementId = "Task_1",
                    AltinnTaskType = "data",
                    Flow = 2,
                    Validated = new()
                    {
                        CanCompleteTask = true
                    }
                }
            }
        };
        ProcessState originalProcessState = instance.Process.Copy();
        ClaimsPrincipal user = new(new ClaimsIdentity(new List<Claim>()
        {
            new(AltinnCoreClaimTypes.UserId, "1337"),
            new(AltinnCoreClaimTypes.AuthenticationLevel, "2"),
            new(AltinnCoreClaimTypes.Org, "tdd"),
        }));
        ProcessNextRequest processNextRequest = new ProcessNextRequest() { Instance = instance, User = user, Action = "reject" };
        ProcessChangeResult result = await processEngine.Next(processNextRequest);
        _processReaderMock.Verify(r => r.IsProcessTask("Task_1"), Times.Once);
        _processReaderMock.Verify(r => r.IsEndEvent("Task_2"), Times.Once);
        _processReaderMock.Verify(r => r.IsProcessTask("Task_2"), Times.Once);
        _processNavigatorMock.Verify(n => n.GetNextTask(It.IsAny<Instance>(), "Task_1", "reject"), Times.Once);

        var expectedInstanceEvents = new List<InstanceEvent>()
        {
            new()
            {
                EventType = InstanceEventType.process_AbandonTask.ToString(),
                InstanceOwnerPartyId = "1337",
                User = new()
                {
                    UserId = 1337,
                    OrgId = "tdd",
                    AuthenticationLevel = 2
                },
                ProcessInfo = new()
                {
                    StartEvent = "StartEvent_1",
                    CurrentTask = new()
                    {
                        ElementId = "Task_1",
                        Flow = 2,
                        AltinnTaskType = "data",
                        Validated = new()
                        {
                            CanCompleteTask = true
                        }
                    }
                }
            },

            new()
            {
                EventType = InstanceEventType.process_StartTask.ToString(),
                InstanceOwnerPartyId = "1337",
                User = new()
                {
                    UserId = 1337,
                    OrgId = "tdd",
                    AuthenticationLevel = 2,
                },
                ProcessInfo = new()
                {
                    StartEvent = "StartEvent_1",
                    CurrentTask = new()
                    {
                        ElementId = "Task_2",
                        Name = "Bekreft",
                        AltinnTaskType = "confirmation",
                        Flow = 3
                    }
                }
            }
        };
        _processEventDispatcherMock.Verify(d => d.UpdateProcessAndDispatchEvents(
            It.Is<Instance>(i => CompareInstance(expectedInstance, i)),
            It.IsAny<Dictionary<string, string>?>(),
            It.Is<List<InstanceEvent>>(l => CompareInstanceEvents(expectedInstanceEvents, l))));
        _processEventDispatcherMock.Verify(d => d.RegisterEventWithEventsComponent(It.Is<Instance>(i => CompareInstance(expectedInstance, i))));
        result.Success.Should().BeTrue();
        result.ProcessStateChange.Should().BeEquivalentTo(
            new ProcessStateChange()
            {
                Events = expectedInstanceEvents,
                NewProcessState = expectedInstance.Process,
                OldProcessState = originalProcessState
            });
    }

    [Fact]
    public async Task Next_moves_instance_to_end_event_and_ends_proces()
    {
        var expectedInstance = new Instance()
        {
            InstanceOwner = new InstanceOwner()
            {
                PartyId = "1337"
            },
            Process = new ProcessState()
            {
                CurrentTask = null,
                StartEvent = "StartEvent_1",
                EndEvent = "EndEvent_1"
            }
        };
        IProcessEngine processEngine = GetProcessEngine(null, expectedInstance);
        Instance instance = new Instance()
        {
            InstanceOwner = new()
            {
                PartyId = "1337"
            },
            Process = new ProcessState()
            {
                StartEvent = "StartEvent_1",
                CurrentTask = new()
                {
                    ElementId = "Task_2",
                    AltinnTaskType = "confirmation",
                    Flow = 3,
                    Validated = new()
                    {
                        CanCompleteTask = true
                    }
                }
            }
        };
        ProcessState originalProcessState = instance.Process.Copy();
        ClaimsPrincipal user = new(new ClaimsIdentity(new List<Claim>()
        {
            new(AltinnCoreClaimTypes.UserId, "1337"),
            new(AltinnCoreClaimTypes.AuthenticationLevel, "2"),
        }));
        ProcessNextRequest processNextRequest = new ProcessNextRequest() { Instance = instance, User = user };
        ProcessChangeResult result = await processEngine.Next(processNextRequest);
        _processReaderMock.Verify(r => r.IsProcessTask("Task_2"), Times.Once);
        _processReaderMock.Verify(r => r.IsEndEvent("EndEvent_1"), Times.Once);
        _profileMock.Verify(p => p.GetUserProfile(1337), Times.Exactly(3));
        _processNavigatorMock.Verify(n => n.GetNextTask(It.IsAny<Instance>(), "Task_2", null), Times.Once);

        var expectedInstanceEvents = new List<InstanceEvent>()
        {
            new()
            {
                EventType = InstanceEventType.process_EndTask.ToString(),
                InstanceOwnerPartyId = "1337",
                User = new()
                {
                    UserId = 1337,
                    AuthenticationLevel = 2,
                    NationalIdentityNumber = "22927774937"
                },
                ProcessInfo = new()
                {
                    StartEvent = "StartEvent_1",
                    CurrentTask = new()
                    {
                        ElementId = "Task_2",
                        Flow = 3,
                        AltinnTaskType = "confirmation",
                        Validated = new()
                        {
                            CanCompleteTask = true
                        }
                    }
                }
            },

            new()
            {
                EventType = InstanceEventType.process_EndEvent.ToString(),
                InstanceOwnerPartyId = "1337",
                User = new()
                {
                    UserId = 1337,
                    NationalIdentityNumber = "22927774937",
                    AuthenticationLevel = 2,
                },
                ProcessInfo = new()
                {
                    StartEvent = "StartEvent_1",
                    CurrentTask = null,
                    EndEvent = "EndEvent_1"
                }
            },
            new()
            {
                EventType = InstanceEventType.Submited.ToString(),
                InstanceOwnerPartyId = "1337",
                User = new()
                {
                    UserId = 1337,
                    NationalIdentityNumber = "22927774937",
                    AuthenticationLevel = 2,
                },
                ProcessInfo = new()
                {
                    StartEvent = "StartEvent_1",
                    CurrentTask = null,
                    EndEvent = "EndEvent_1"
                }
            }
        };
        _processEventDispatcherMock.Verify(d => d.UpdateProcessAndDispatchEvents(
            It.Is<Instance>(i => CompareInstance(expectedInstance, i)),
            It.IsAny<Dictionary<string, string>?>(),
            It.Is<List<InstanceEvent>>(l => CompareInstanceEvents(expectedInstanceEvents, l))));
        _processEventDispatcherMock.Verify(d => d.RegisterEventWithEventsComponent(It.Is<Instance>(i => CompareInstance(expectedInstance, i))));
        result.Success.Should().BeTrue();
        result.ProcessStateChange.Should().BeEquivalentTo(
            new ProcessStateChange()
            {
                Events = expectedInstanceEvents,
                NewProcessState = expectedInstance.Process,
                OldProcessState = originalProcessState
            });
    }

    [Fact]
    public async Task UpdateInstanceAndRerunEvents_sends_instance_and_events_to_eventdispatcher()
    {
        Instance instance = new Instance()
        {
            InstanceOwner = new InstanceOwner()
            {
                PartyId = "1337"
            },
            Process = new ProcessState()
            {
                StartEvent = "StartEvent_1",
                CurrentTask = new ProcessElementInfo()
                {
                    ElementId = "Task_1",
                    Flow = 3,
                    AltinnTaskType = "confirmation",
                    Validated = new()
                    {
                        CanCompleteTask = true
                    }
                }
            }
        };
        Instance updatedInstance = new Instance()
        {
            Org = "ttd",
            InstanceOwner = new InstanceOwner()
            {
                PartyId = "1337"
            },
            Process = new ProcessState()
            {
                StartEvent = "StartEvent_1",
                CurrentTask = new ProcessElementInfo()
                {
                    ElementId = "Task_1",
                    Flow = 3,
                    AltinnTaskType = "confirmation",
                    Validated = new()
                    {
                        CanCompleteTask = true
                    }
                }
            }
        };
        Dictionary<string, string> prefill = new Dictionary<string, string>()
        {
            { "test", "test" }
        };
        List<InstanceEvent> events = new List<InstanceEvent>()
        {
            new()
            {
                EventType = InstanceEventType.process_AbandonTask.ToString(),
                InstanceOwnerPartyId = "1337",
                User = new()
                {
                    UserId = 1337,
                    OrgId = "tdd",
                    AuthenticationLevel = 2
                },
                ProcessInfo = new()
                {
                    StartEvent = "StartEvent_1",
                    CurrentTask = new()
                    {
                        ElementId = "Task_1",
                        Flow = 2,
                        AltinnTaskType = "data",
                        Validated = new()
                        {
                            CanCompleteTask = true
                        }
                    }
                }
            }
        };
        IProcessEngine processEngine = GetProcessEngine(null, updatedInstance);
        ProcessStartRequest processStartRequest = new ProcessStartRequest()
        {
            Instance = instance,
            Prefill = prefill,
        };
        Instance result = await processEngine.UpdateInstanceAndRerunEvents(processStartRequest, events);
        _processEventDispatcherMock.Verify(d => d.UpdateProcessAndDispatchEvents(
            It.Is<Instance>(i => CompareInstance(instance, i)),
            prefill,
            It.Is<List<InstanceEvent>>(l => CompareInstanceEvents(events, l))));
        result.Should().Be(updatedInstance);
    }

    private IProcessEngine GetProcessEngine(Mock<IProcessReader>? processReaderMock = null, Instance? updatedInstance = null)
    {
        if (processReaderMock == null)
        {
            _processReaderMock = new();
            _processReaderMock.Setup(r => r.GetStartEventIds()).Returns(new List<string>() { "StartEvent_1" });
            _processReaderMock.Setup(r => r.IsProcessTask("StartEvent_1")).Returns(false);
            _processReaderMock.Setup(r => r.IsEndEvent("Task_1")).Returns(false);
            _processReaderMock.Setup(r => r.IsProcessTask("Task_1")).Returns(true);
            _processReaderMock.Setup(r => r.IsProcessTask("Task_2")).Returns(true);
            _processReaderMock.Setup(r => r.IsProcessTask("EndEvent_1")).Returns(false);
            _processReaderMock.Setup(r => r.IsEndEvent("EndEvent_1")).Returns(true);
            _processReaderMock.Setup(r => r.IsProcessTask("EndEvent_1")).Returns(false);
        }
        else
        {
            _processReaderMock = processReaderMock;
        }

        _profileMock.Setup(p => p.GetUserProfile(1337)).ReturnsAsync(() => new UserProfile()
        {
            UserId = 1337,
            Email = "test@example.com",
            Party = new Party()
            {
                SSN = "22927774937"
            }
        });
        _processNavigatorMock.Setup(
                pn => pn.GetNextTask(It.IsAny<Instance>(), "StartEvent_1", It.IsAny<string?>()))
            .ReturnsAsync(() => new ProcessTask()
            {
                Id = "Task_1",
                Incoming = new List<string> { "Flow_1" },
                Outgoing = new List<string> { "Flow_2" },
                Name = "Utfylling",
                ExtensionElements = new()
                {
                    AltinnProperties = new()
                    {
                        TaskType = "data"
                    }
                }
            });
        _processNavigatorMock.Setup(
                pn => pn.GetNextTask(It.IsAny<Instance>(), "Task_1", It.IsAny<string?>()))
            .ReturnsAsync(() => new ProcessTask()
            {
                Id = "Task_2",
                Incoming = new List<string> { "Flow_2" },
                Outgoing = new List<string> { "Flow_3" },
                Name = "Bekreft",
                ExtensionElements = new()
                {
                    AltinnProperties = new()
                    {
                        TaskType = "confirmation"
                    }
                }
            });
        _processNavigatorMock.Setup(
                pn => pn.GetNextTask(It.IsAny<Instance>(), "Task_2", It.IsAny<string?>()))
            .ReturnsAsync(() => new EndEvent()
            {
                Id = "EndEvent_1",
                Incoming = new List<string> { "Flow_3" }
            });
        if (updatedInstance is not null)
        {
            _processEventDispatcherMock.Setup(d => d.UpdateProcessAndDispatchEvents(It.IsAny<Instance>(), It.IsAny<Dictionary<string, string>?>(), It.IsAny<List<InstanceEvent>>()))
                .ReturnsAsync(() => updatedInstance);
        }

        return new ProcessEngine(
            _processReaderMock.Object,
            _profileMock.Object,
            _processNavigatorMock.Object,
            _processEventDispatcherMock.Object);
    }

    public void Dispose()
    {
        _processReaderMock.VerifyNoOtherCalls();
        _profileMock.VerifyNoOtherCalls();
        _processNavigatorMock.VerifyNoOtherCalls();
        _processEventDispatcherMock.VerifyNoOtherCalls();
    }

    private static bool CompareInstance(Instance expected, Instance actual)
    {
        expected.Process.Started = actual.Process.Started;
        expected.Process.Ended = actual.Process.Ended;
        if (actual.Process.CurrentTask != null)
        {
            expected.Process.CurrentTask.Started = actual.Process.CurrentTask.Started;
        }

        return JsonCompare(expected, actual);
    }

    private static bool CompareInstanceEvents(List<InstanceEvent> expected, List<InstanceEvent> actual)
    {
        for (int i = 0; i < expected.Count; i++)
        {
            expected[i].Created = actual[i].Created;
            expected[i].ProcessInfo.Started = actual[i].ProcessInfo.Started;
            expected[i].ProcessInfo.Ended = actual[i].ProcessInfo.Ended;
            if (actual[i].ProcessInfo.CurrentTask != null)
            {
                expected[i].ProcessInfo.CurrentTask.Started = actual[i].ProcessInfo.CurrentTask.Started;
            }
        }

        return JsonCompare(expected, actual);
    }

    public static bool JsonCompare(object expected, object actual)
    {
        if (ReferenceEquals(expected, actual))
        {
            return true;
        }

        if ((expected == null) || (actual == null))
        {
            return false;
        }

        if (expected.GetType() != actual.GetType())
        {
            return false;
        }

        var expectedJson = JsonConvert.SerializeObject(expected);
        var actualJson = JsonConvert.SerializeObject(actual);

        return expectedJson == actualJson;
    }
}
