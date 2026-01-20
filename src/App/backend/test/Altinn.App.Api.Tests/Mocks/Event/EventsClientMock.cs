using Altinn.App.Core.Internal.Events;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Api.Tests.Mocks.Event;

public class EventsClientMock : IEventsClient
{
    public Task<string> AddEvent(string eventType, Instance instance)
    {
        throw new NotImplementedException();
    }
}
