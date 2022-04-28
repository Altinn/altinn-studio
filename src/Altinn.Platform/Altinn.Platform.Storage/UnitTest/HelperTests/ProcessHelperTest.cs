using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;

using Altinn.Platform.Storage.Helpers;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;

using Xunit;

namespace Altinn.Platform.Storage.UnitTest.HelperTests
{
    public class ProcessHelperTest
    {
        [Theory]
        [MemberData(nameof(InstanceEventData_ExpectedProps))]
        public void MapInstanceEventsToProcessHistoryTest(InstanceEvent instanceEvent, string expectedPerformedBy, string expectedEventType)
        {
            ProcessHistoryItem actual = ProcessHelper.MapInstanceEventsToProcessHistory(new List<InstanceEvent> { instanceEvent }).First();
            Assert.Equal(expectedPerformedBy, actual.PerformedBy);
            Assert.Equal(expectedEventType, actual.EventType);
        }

        public static IEnumerable<object[]> InstanceEventData_ExpectedProps =>
       new List<object[]>
       {
            new object[]
            {
                new InstanceEvent
                {
                    EventType = InstanceEventType.process_StartEvent.ToString(),
                    Created = DateTime.UtcNow,
                    ProcessInfo = new ProcessState
                    {
                        StartEvent = "StartEvent_1",
                        Started = DateTime.UtcNow,
                    },
                    User = new PlatformUser
                    {
                        AuthenticationLevel = 2,
                        UserId = 1337,
                        NationalIdentityNumber = "16069412345"
                    }
                },
                "16069412345",
                "process_StartEvent"
            },
            new object[]
            {
                new InstanceEvent
                {
                    EventType = InstanceEventType.process_StartTask.ToString(),
                    Created = DateTime.UtcNow,
                    ProcessInfo = new ProcessState
                    {
                        StartEvent = "StartEvent_1",
                        Started = DateTime.UtcNow.AddDays(-1),
                        CurrentTask = new ProcessElementInfo
                        {
                            Flow = 2,
                            Started = DateTime.UtcNow,
                            ElementId = "Task_1",
                            Name = "Utfylling"
                        }
                    },
                    User = new PlatformUser
                    {
                        AuthenticationLevel = 2,
                        OrgId = "888472312"
                    }
                },
                "888472312",
                "process_StartTask"
            },
            new object[]
            {
                new InstanceEvent
                {
                    EventType = InstanceEventType.process_EndTask.ToString(),
                    Created = DateTime.UtcNow,
                    ProcessInfo = new ProcessState
                    {
                        StartEvent = "StartEvent_1",
                        Started = DateTime.UtcNow.AddDays(-1),
                        CurrentTask = new ProcessElementInfo
                        {
                            Flow = 2,
                            Started = DateTime.UtcNow,
                            ElementId = "Task_1",
                            Name = "Utfylling",
                            FlowType = "CompleteCurrentMoveToNext"
                        }
                    },
                    User = new PlatformUser
                    {
                        AuthenticationLevel = 2,
                        OrgId = "888472312"
                    }
                },
                "888472312",
                "process_EndTask"
            },
            new object[]
            {
                new InstanceEvent
                {
                    EventType = InstanceEventType.process_EndEvent.ToString(),
                    Created = DateTime.UtcNow,
                    ProcessInfo = new ProcessState
                    {
                        StartEvent = "StartEvent_1",
                        Started = DateTime.UtcNow.AddDays(-1),
                        Ended = DateTime.UtcNow,
                        EndEvent = "EndEvent_1"
                    },
                    User = new PlatformUser
                    {
                        AuthenticationLevel = 2,
                        UserId = 1337
                    }
                },
                string.Empty,
                "process_EndEvent"
            }
       };
    }
}
