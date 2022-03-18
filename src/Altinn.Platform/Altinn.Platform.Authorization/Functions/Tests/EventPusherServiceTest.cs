using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Platform.Authorization.Functions.Clients;
using Altinn.Platform.Authorization.Functions.Clients.Interfaces;
using Altinn.Platform.Authorization.Functions.Exceptions;
using Altinn.Platform.Authorization.Functions.Models;
using Altinn.Platform.Authorization.Functions.Services;
using Altinn.Platform.Authorization.Functions.Services.Interfaces;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace Altinn.Platform.Authorization.Functions.UnitTest;

public class EventPusherServiceTest
{
    private readonly Mock<ILogger<EventPusherService>> _logger;
    private readonly Mock<IBridgeClient> _bridgeClient;
    private readonly Mock<IEventMapperService> _eventMapperService;

    public EventPusherServiceTest()
    {
        _logger = new Mock<ILogger<EventPusherService>>();
        _bridgeClient = new Mock<IBridgeClient>();
        _eventMapperService = new Mock<IEventMapperService>();

        _logger.Setup(x => x.IsEnabled(It.IsAny<LogLevel>())).Returns(true);
    }

    [Fact]
    public async Task EmptyDelegationChangeList_Noop()
    {
        // Arrange
        EventPusherService eventPusherService = new EventPusherService(_logger.Object, _bridgeClient.Object, _eventMapperService.Object);

        // Act and assert no exceptions thrown
        await eventPusherService.PushEvents(new DelegationChangeEventList());
    }

    [Fact]
    public async Task NullDelegationChangeList_Fail()
    {
        // Arrange
        EventPusherService eventPusherService = new EventPusherService(_logger.Object, _bridgeClient.Object, _eventMapperService.Object);

        // Act and assert exception thrown
        await Assert.ThrowsAsync<BridgeRequestFailedException>(
            async () => await eventPusherService.PushEvents(null));
    }

    [Fact]
    public async Task PostDelegationEvents_Success()
    {
        // Arrange with 200 response
        EventPusherService eventPusherService = new EventPusherService(_logger.Object, _bridgeClient.Object, _eventMapperService.Object);
        _bridgeClient.Setup(x => x.PostDelegationEventsAsync(It.IsAny<List<PlatformDelegationEvent>>()))
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK));

        // Act and assert no exceptions thrown
        await eventPusherService.PushEvents(GetDelegationChangeList());
    }

    [Fact]
    public async Task PostDelegationEvents_Non200_Fail()
    {
        // Arrange with 400 response
        EventPusherService eventPusherService = new EventPusherService(_logger.Object, _bridgeClient.Object, _eventMapperService.Object);
        _bridgeClient.Setup(x => x.PostDelegationEventsAsync(It.IsAny<List<PlatformDelegationEvent>>()))
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.BadRequest));

        // Act and assert exception thrown
        await Assert.ThrowsAsync<BridgeRequestFailedException>(
            async () => await eventPusherService.PushEvents(GetDelegationChangeList()));
    }

    [Fact]
    public async Task PostDelegationEvents_Exception_Fail()
    {
        // Arrange with HttpRequestException (timeout, network errors etc)
        EventPusherService eventPusherService = new EventPusherService(_logger.Object, _bridgeClient.Object, _eventMapperService.Object);
        _bridgeClient.Setup(x => x.PostDelegationEventsAsync(It.IsAny<List<PlatformDelegationEvent>>()))
            .ThrowsAsync(new HttpRequestException());

        // Act and assert exception thrown
        await Assert.ThrowsAsync<BridgeRequestFailedException>(
            async () => await eventPusherService.PushEvents(GetDelegationChangeList()));
    }

    private static DelegationChangeEventList GetDelegationChangeList()
    {
        return new DelegationChangeEventList
        {
            DelegationChangeEvents = new List<DelegationChangeEvent>
            {
                new()
                {
                    EventType = DelegationChangeEventType.Grant,
                    DelegationChange = new DelegationChange
                    {
                        PolicyChangeId = 1,
                        AltinnAppId = "ttd/testapp",
                        OfferedByPartyId = 123,
                        CoveredByPartyId = 234,
                        PerformedByUserId = 567,
                        Created = DateTime.UtcNow
                    }
                },
                new()
                {
                    EventType = DelegationChangeEventType.Revoke,
                    DelegationChange = new DelegationChange
                    {
                        PolicyChangeId = 2,
                        AltinnAppId = "ttd/testapp",
                        OfferedByPartyId = 123,
                        CoveredByPartyId = 234,
                        PerformedByUserId = 567,
                        Created = DateTime.UtcNow
                    }
                },
                new()
                {
                    EventType = DelegationChangeEventType.Grant,
                    DelegationChange = new DelegationChange
                    {
                        PolicyChangeId = 3,
                        AltinnAppId = "ttd/testapp",
                        OfferedByPartyId = 123,
                        CoveredByUserId = 345,
                        PerformedByUserId = 567,
                        Created = DateTime.UtcNow
                    }
                },
                new()
                {
                    EventType = DelegationChangeEventType.RevokeLast,
                    DelegationChange = new DelegationChange
                    {
                        PolicyChangeId = 4,
                        AltinnAppId = "ttd/testapp",
                        OfferedByPartyId = 123,
                        CoveredByUserId = 345,
                        PerformedByUserId = 567,
                        Created = DateTime.UtcNow
                    }
                }
            }
        };
    }
}
