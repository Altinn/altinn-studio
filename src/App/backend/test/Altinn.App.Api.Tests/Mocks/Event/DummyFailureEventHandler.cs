using Altinn.App.Core.Features;
using Altinn.App.Core.Models;

namespace Altinn.App.Api.Tests.Mocks.Event;

public class DummyFailureEventHandler : IEventHandler
{
    public string EventType => "app.event.dummy.failure";

    public Task<bool> ProcessEvent(CloudEvent cloudEvent)
    {
        return Task.FromResult(true);
    }
}
