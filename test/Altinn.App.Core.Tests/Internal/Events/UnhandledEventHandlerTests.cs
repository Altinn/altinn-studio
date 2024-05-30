#nullable disable
using Altinn.App.Core.Internal.Events;
using FluentAssertions;

namespace Altinn.App.PlatformServices.Tests.Internal.Events;

public class UnhandledEventHandlerTests
{
    [Fact]
    public void ProcessEvent_ShouldThrowNotImplementedException()
    {
        var handler = new UnhandledEventHandler();

        Action action = () => handler.ProcessEvent(null);

        action.Should().Throw<NotImplementedException>();
    }
}
