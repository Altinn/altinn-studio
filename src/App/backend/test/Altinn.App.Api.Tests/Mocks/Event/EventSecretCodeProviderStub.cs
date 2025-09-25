using Altinn.App.Core.Internal.Events;

namespace Altinn.App.Api.Tests.Mocks.Event;

public class EventSecretCodeProviderStub : IEventSecretCodeProvider
{
    public Task<string> GetSecretCode()
    {
        return Task.FromResult("42");
    }
}
