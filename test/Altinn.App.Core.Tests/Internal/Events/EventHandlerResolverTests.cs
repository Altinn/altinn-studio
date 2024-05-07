#nullable disable
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Events;
using Altinn.App.Core.Models;
using FluentAssertions;
using Moq;
using Xunit;

namespace Altinn.App.PlatformServices.Tests.Internal.Events
{
    public class EventHandlerResolverTests
    {
        [Fact]
        public async Task ResolveEventHandler_SubscriptionValidationHandler_ShouldReturnSubscriptionValidationHandler()
        {
            var factory = new EventHandlerResolver(new List<IEventHandler>() { new SubscriptionValidationHandler() });

            IEventHandler eventHandler = factory.ResolveEventHandler("platform.events.validatesubscription");

            eventHandler.Should().BeOfType<SubscriptionValidationHandler>();
            eventHandler.EventType.Should().Be("platform.events.validatesubscription");
            var success = await eventHandler.ProcessEvent(new CloudEvent());
            success.Should().BeTrue();
        }

        [Fact]
        public void ResolveEventHandler_InvalidEventType_ShouldReturnUnhandledEventHandler()
        {
            var factory = new EventHandlerResolver(new List<IEventHandler>());

            IEventHandler eventHandler = factory.ResolveEventHandler("this.event.should.not.exists");
            Action action = () => eventHandler.ProcessEvent(new CloudEvent());

            eventHandler.Should().BeOfType<UnhandledEventHandler>();
            eventHandler.EventType.Should().Be("app.events.unhandled");
            action.Should().Throw<NotImplementedException>();
        }

        [Fact]
        public void ResolveEventHandler_Null_ShouldReturnUnhandledEventHandler()
        {
            var factory = new EventHandlerResolver(new List<IEventHandler>());

            IEventHandler eventHandler = factory.ResolveEventHandler(null);

            eventHandler.Should().BeOfType<UnhandledEventHandler>();
        }
    }
}
