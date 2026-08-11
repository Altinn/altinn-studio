#nullable disable
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Infrastructure.Clients.Events;
using Altinn.App.Core.Internal.Events;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.PlatformServices.Tests.Extensions;

public class ServiceCollectionTests
{
    [Fact]
    public void IsAdded_Added_ShouldReturnTrue()
    {
        IServiceCollection services = new ServiceCollection();
        services.AddHttpClient<IEventsClient, EventsClient>();

        Assert.True(services.IsAdded(typeof(IEventsClient)));
    }

    [Fact]
    public void IsAdded_NotAdded_ShouldReturnFalse()
    {
        IServiceCollection services = new ServiceCollection();

        Assert.False(services.IsAdded(typeof(IEventsClient)));
    }
}
