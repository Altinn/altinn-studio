using System;
using System.Collections.Generic;
using Altinn.Platform.Authorization.Functions.Models;
using Altinn.Platform.Authorization.Functions.Services;
using FluentAssertions;
using Xunit;

namespace Altinn.Platform.Authorization.Functions.UnitTest;

public class EventMapperServiceTest
{
    [Fact]
    public void MapEventWithCoveredByParty()
    {
        // Arrange
        EventMapperService service = new();
        DateTime now = DateTime.Now;
        DelegationChangeEventList input = new()
        {
            DelegationChangeEvents = new List<DelegationChangeEvent>
            {
                new()
                {
                    EventType = DelegationChangeEventType.Grant,
                    DelegationChange = new DelegationChange
                    {
                        DelegationChangeId = 1,
                        AltinnAppId = "ttd/testapp",
                        OfferedByPartyId = 123,
                        CoveredByPartyId = 234,
                        PerformedByUserId = 567,
                        Created = now
                    }
                }
            }
        };

        List<PlatformDelegationEvent> expectedOutput = new List<PlatformDelegationEvent>()
        {
            new()
            {
                PolicyChangeId = 1,
                EventType = DelegationChangeEventType.Grant,
                AltinnAppId = "ttd/testapp",
                OfferedByPartyId = 123,
                CoveredByPartyId = 234,
                CoveredByUserId = 0,
                PerformedByUserId = 567,
                Created = now
            }
        };

        // Act
        List<PlatformDelegationEvent> output = service.MapToPlatformEventList(input);

        // Assert
        expectedOutput.Should().BeEquivalentTo(output);
    }

    [Fact]
    public void MapEventWithCoveredByUser()
    {
        // Arrange
        EventMapperService service = new();
        DateTime now = DateTime.Now;
        DelegationChangeEventList input = new()
        {
            DelegationChangeEvents = new List<DelegationChangeEvent>
            {
                new()
                {
                    EventType = DelegationChangeEventType.Grant,
                    DelegationChange = new DelegationChange
                    {
                        DelegationChangeId = 1,
                        AltinnAppId = "ttd/testapp",
                        OfferedByPartyId = 123,
                        CoveredByUserId = 234,
                        PerformedByUserId = 567,
                        Created = now
                    }
                }
            }
        };

        List<PlatformDelegationEvent> expectedOutput = new List<PlatformDelegationEvent>()
        {
            new()
            {
                PolicyChangeId = 1,
                EventType = DelegationChangeEventType.Grant,
                AltinnAppId = "ttd/testapp",
                OfferedByPartyId = 123,
                CoveredByPartyId = 0,
                CoveredByUserId = 234,
                PerformedByUserId = 567,
                Created = now
            }
        };

        // Act
        List<PlatformDelegationEvent> output = service.MapToPlatformEventList(input);

        // Assert
        expectedOutput.Should().BeEquivalentTo(output);
    }
}
