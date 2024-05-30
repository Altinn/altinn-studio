#nullable disable
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Infrastructure.Clients.Events;
using Altinn.App.Core.Internal.Events;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.PlatformServices.Tests.Extensions;

public class ServiceCollectionTests
{
    [Fact]
    public void IsAdded_Added_ShouldReturnTrue()
    {
        IServiceCollection services = new ServiceCollection();
        services.AddHttpClient<IEventsSubscription, EventsSubscriptionClient>();

        services.IsAdded(typeof(IEventsSubscription)).Should().BeTrue();
    }

    [Fact]
    public void IsAdded_NotAdded_ShouldReturnFalse()
    {
        IServiceCollection services = new ServiceCollection();

        services.IsAdded(typeof(IEventsSubscription)).Should().BeFalse();
    }
}
