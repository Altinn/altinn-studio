using Altinn.App.Core.Features;
using Altinn.App.Core.Models;

namespace Altinn.App.Api.Tests.Mocks.Event;

public class DummySuccessEventHandler : IEventHandler
{
    public string EventType => "app.event.dummy.success";

    public Task<bool> ProcessEvent(CloudEvent cloudEvent)
    {
        return Task.FromResult(true);
    }
}
