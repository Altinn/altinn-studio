#nullable disable
using Altinn.App.Core.Extensions;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;

namespace Altinn.App.Core.Tests.Extensions;

public class InstanceEventExtensionsTests
{
    [Fact]
    public void CopyValues_returns_copy_of_instance_event()
    {
        InstanceEvent original = new InstanceEvent()
        {
            Created = DateTime.Now,
            DataId = Guid.NewGuid().ToString(),
            EventType = "EventType",
            Id = Guid.NewGuid(),
            InstanceId = Guid.NewGuid().ToString(),
            InstanceOwnerPartyId = "1",
            ProcessInfo = new ProcessState
            {
                Started = DateTime.Now,
                CurrentTask = new ProcessElementInfo
                {
                    Flow = 1,
                    AltinnTaskType = "AltinnTaskType",
                    ElementId = "ElementId",
                    Name = "Name",
                    Started = DateTime.Now,
                    Ended = DateTime.Now,
                    Validated = new ValidationStatus { CanCompleteTask = true, Timestamp = DateTime.Now },
                },
                StartEvent = "StartEvent",
            },
            User = new PlatformUser
            {
                AuthenticationLevel = 2,
                EndUserSystemId = 1,
                OrgId = "OrgId",
                UserId = 3,
                NationalIdentityNumber = "NationalIdentityNumber",
            },
        };
        InstanceEvent copy = original.CopyValues();
        copy.Should().NotBeSameAs(original);
        copy.ProcessInfo.Should().NotBeSameAs(original.ProcessInfo);
        copy.ProcessInfo.CurrentTask.Should().NotBeSameAs(original.ProcessInfo.CurrentTask);
        copy.ProcessInfo.CurrentTask.Validated.Should().NotBeSameAs(original.ProcessInfo.CurrentTask.Validated);
        copy.User.Should().NotBeSameAs(original.User);
        copy.Should().BeEquivalentTo(original);
    }

    [Fact]
    public void CopyValues_returns_copy_of_instance_event_Validated_null()
    {
        Guid id = Guid.NewGuid();
        string dataGuid = Guid.NewGuid().ToString();
        string instanceGuid = Guid.NewGuid().ToString();
        DateTime now = DateTime.Now;
        InstanceEvent original = new InstanceEvent()
        {
            Created = now,
            DataId = dataGuid,
            EventType = "EventType",
            Id = id,
            InstanceId = instanceGuid,
            InstanceOwnerPartyId = "1",
            ProcessInfo = new ProcessState
            {
                Started = now,
                CurrentTask = new ProcessElementInfo
                {
                    Flow = 1,
                    AltinnTaskType = "AltinnTaskType",
                    ElementId = "ElementId",
                    Name = "Name",
                    Started = now,
                    Ended = now,
                    Validated = null,
                },
                StartEvent = "StartEvent",
            },
            User = new PlatformUser
            {
                AuthenticationLevel = 2,
                EndUserSystemId = 1,
                OrgId = "OrgId",
                UserId = 3,
                NationalIdentityNumber = "NationalIdentityNumber",
            },
        };
        InstanceEvent expected = new InstanceEvent()
        {
            Created = now,
            DataId = dataGuid,
            EventType = "EventType",
            Id = id,
            InstanceId = instanceGuid,
            InstanceOwnerPartyId = "1",
            ProcessInfo = new ProcessState
            {
                Started = now,
                CurrentTask = new ProcessElementInfo
                {
                    Flow = 1,
                    AltinnTaskType = "AltinnTaskType",
                    ElementId = "ElementId",
                    Name = "Name",
                    Started = now,
                    Ended = now,
                    Validated = new() { Timestamp = null, CanCompleteTask = false },
                },
                StartEvent = "StartEvent",
            },
            User = new PlatformUser
            {
                AuthenticationLevel = 2,
                EndUserSystemId = 1,
                OrgId = "OrgId",
                UserId = 3,
                NationalIdentityNumber = "NationalIdentityNumber",
            },
        };
        InstanceEvent copy = original.CopyValues();
        copy.Should().NotBeSameAs(original);
        copy.ProcessInfo.Should().NotBeSameAs(original.ProcessInfo);
        copy.ProcessInfo.CurrentTask.Should().NotBeSameAs(original.ProcessInfo.CurrentTask);
        copy.ProcessInfo.CurrentTask.Validated.Should().NotBeSameAs(original.ProcessInfo.CurrentTask.Validated);
        copy.User.Should().NotBeSameAs(original.User);
        copy.Should().BeEquivalentTo(expected);
    }

    [Fact]
    public void CopyValues_returns_copy_of_instance_event_CurrentTask_null()
    {
        Guid id = Guid.NewGuid();
        string dataGuid = Guid.NewGuid().ToString();
        string instanceGuid = Guid.NewGuid().ToString();
        DateTime now = DateTime.Now;
        InstanceEvent original = new InstanceEvent()
        {
            Created = now,
            DataId = dataGuid,
            EventType = "EventType",
            Id = id,
            InstanceId = instanceGuid,
            InstanceOwnerPartyId = "1",
            ProcessInfo = new ProcessState
            {
                Started = now,
                CurrentTask = null,
                StartEvent = "StartEvent",
            },
            User = new PlatformUser
            {
                AuthenticationLevel = 2,
                EndUserSystemId = 1,
                OrgId = "OrgId",
                UserId = 3,
                NationalIdentityNumber = "NationalIdentityNumber",
            },
        };
        InstanceEvent expected = new InstanceEvent()
        {
            Created = now,
            DataId = dataGuid,
            EventType = "EventType",
            Id = id,
            InstanceId = instanceGuid,
            InstanceOwnerPartyId = "1",
            ProcessInfo = new ProcessState
            {
                Started = now,
                CurrentTask = new ProcessElementInfo
                {
                    Flow = null,
                    AltinnTaskType = null,
                    ElementId = null,
                    Name = null,
                    Started = null,
                    Ended = null,
                    Validated = new() { Timestamp = null, CanCompleteTask = false },
                },
                StartEvent = "StartEvent",
            },
            User = new PlatformUser
            {
                AuthenticationLevel = 2,
                EndUserSystemId = 1,
                OrgId = "OrgId",
                UserId = 3,
                NationalIdentityNumber = "NationalIdentityNumber",
            },
        };
        InstanceEvent copy = original.CopyValues();
        copy.Should().NotBeSameAs(original);
        copy.ProcessInfo.Should().NotBeSameAs(original.ProcessInfo);
        copy.ProcessInfo.CurrentTask.Should().NotBeSameAs(original.ProcessInfo.CurrentTask);
        copy.User.Should().NotBeSameAs(original.User);
        copy.Should().BeEquivalentTo(expected);
    }
}
