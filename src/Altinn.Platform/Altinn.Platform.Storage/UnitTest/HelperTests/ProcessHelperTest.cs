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
        [MemberData(nameof(InstanceEventDataAndExpectedPerformedBy))]
        public void MapsCorrectPerformedBy(InstanceEvent instanceEvent, string expectedPerformedBy)
        {
            ProcessHistoryItem actual= ProcessHelper.MapInstanceEventsToProcessHistory(new List<InstanceEvent> { instanceEvent }).First();

            Assert.Equal(expectedPerformedBy, actual.PerformedBy);
        }

        public static IEnumerable<object[]> InstanceEventDataAndExpectedPerformedBy =>
       new List<object[]>
       {
            new object[]
            {
                new InstanceEvent
                {
                    EventType = InstanceEventType.process_StartEvent.ToString(),
                    Created = DateTime.Now,
                    ProcessInfo = new ProcessState
                    {
                        StartEvent = "StartEvent_1",
                        Started = DateTime.Now,
                    },
                    User = new PlatformUser
                    {
                        AuthenticationLevel = 2,
                        UserId = 1337,
                        NationalIdentityNumber = "16069412345"
                    }
                },
                "16069412345"
            },
            new object[]
            {
                new InstanceEvent
                {
                    EventType = InstanceEventType.process_StartEvent.ToString(),
                    Created = DateTime.Now,
                    ProcessInfo = new ProcessState
                    {
                        StartEvent = "StartEvent_1",
                        Started = DateTime.Now,
                    },
                    User = new PlatformUser
                    {
                        AuthenticationLevel = 2,           
                        OrgId = "888472312"
                    }
                },
                "888472312"
            },
            new object[]
            {
                new InstanceEvent
                {
                    EventType = InstanceEventType.process_StartEvent.ToString(),
                    Created = DateTime.Now,
                    ProcessInfo = new ProcessState
                    {
                        StartEvent = "StartEvent_1",
                        Started = DateTime.Now,
                    },
                    User = new PlatformUser
                    {
                        AuthenticationLevel = 2,
                        UserId = 1337
                    }
                },
                string.Empty
            }
       };

        public static IEnumerable<object[]> GetInstanceEventsAndPerformedBy()
        {
            yield return new object[]
            {
            new InstanceEvent{ }
            };
        }
    }

    public class ProcessHelperTestdata : IEnumerable<object[]>
    {
        public IEnumerator<object[]> GetEnumerator()
        {
            yield return new object[]
            {
            new InstanceEvent
            {
                EventType = InstanceEventType.process_StartEvent.ToString(),
                Created = DateTime.Now,
                ProcessInfo = new ProcessState
                {
                    StartEvent = "StartEvent_1",
                    Started = DateTime.Now,
                },
                User = new PlatformUser
                {
                    AuthenticationLevel = 2,
                    UserId = 1337,
                    NationalIdentityNumber = "16069412345"
                }
            },
            "16069412345"
            };

            yield return new object[]
            {
            new InstanceEvent
            {
                EventType = InstanceEventType.process_EndEvent.ToString(),
                Created = DateTime.Now,
                ProcessInfo = new ProcessState
                {
                    StartEvent = "StartEvent_1",
                    EndEvent = "EndEvent_1",
                    Ended = DateTime.Now,
                },
                User = new PlatformUser
                {
                    AuthenticationLevel = 2,
                    UserId = 1337,
                    NationalIdentityNumber = "16069412345"
                }
            },
            "16069412345"
            };

        }

        IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
    }

}
