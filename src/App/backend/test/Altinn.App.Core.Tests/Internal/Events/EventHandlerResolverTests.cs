using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Events;
using Altinn.App.Core.Models;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.PlatformServices.Tests.Internal.Events;

public class EventHandlerResolverTests
{
    private sealed record Fixture(IServiceProvider ServiceProvider) : IDisposable
    {
        public IEventHandlerResolver Factory => ServiceProvider.GetRequiredService<IEventHandlerResolver>();

        public static Fixture Create(IEnumerable<IEventHandler> eventHandlers)
        {
            var services = new ServiceCollection();
            services.AddAppImplementationFactory();

            services.AddTransient<IEventHandlerResolver, EventHandlerResolver>();

            foreach (var eventHandler in eventHandlers)
                services.AddTransient(_ => eventHandler);

            return new Fixture(services.BuildStrictServiceProvider());
        }

        public void Dispose() => (ServiceProvider as IDisposable)?.Dispose();
    }

    [Fact]
    public async Task ResolveEventHandler_SubscriptionValidationHandler_ShouldReturnSubscriptionValidationHandler()
    {
        using var fixture = Fixture.Create([new SubscriptionValidationHandler()]);
        var factory = fixture.Factory;

        IEventHandler eventHandler = factory.ResolveEventHandler("platform.events.validatesubscription");

        eventHandler.Should().BeOfType<SubscriptionValidationHandler>();
        eventHandler.EventType.Should().Be("platform.events.validatesubscription");
        var success = await eventHandler.ProcessEvent(new CloudEvent());
        success.Should().BeTrue();
    }

    [Fact]
    public void ResolveEventHandler_InvalidEventType_ShouldReturnUnhandledEventHandler()
    {
        using var fixture = Fixture.Create([]);
        var factory = fixture.Factory;

        IEventHandler eventHandler = factory.ResolveEventHandler("this.event.should.not.exists");
        Action action = () => eventHandler.ProcessEvent(new CloudEvent());

        eventHandler.Should().BeOfType<UnhandledEventHandler>();
        eventHandler.EventType.Should().Be("app.events.unhandled");
        action.Should().Throw<NotImplementedException>();
    }

    [Fact]
    public void ResolveEventHandler_Null_ShouldReturnUnhandledEventHandler()
    {
        using var fixture = Fixture.Create([]);
        var factory = fixture.Factory;

        IEventHandler eventHandler = factory.ResolveEventHandler(null!);

        eventHandler.Should().BeOfType<UnhandledEventHandler>();
    }
}
