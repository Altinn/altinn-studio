#nullable disable
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Infrastructure.Clients.Events;
using Altinn.App.Core.Infrastructure.Clients.Storage;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Events;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Tests.Common.Fixtures;
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

    [Fact]
    public async Task MockedServiceCollection_ResolvesPublicStorageClientsAsGuardedFacades()
    {
        var services = new MockedServiceCollection();
        await using var serviceProvider = services.BuildServiceProvider();

        var dataClient = serviceProvider.GetRequiredService<IDataClient>();
        var instanceClient = serviceProvider.GetRequiredService<IInstanceClient>();
        var storageDataClient = serviceProvider.GetRequiredService<IStorageDataClient>();
        var storageInstanceClient = serviceProvider.GetRequiredService<IStorageInstanceClient>();
        var metadataInstanceClient = serviceProvider.GetRequiredService<IInstanceClientWithStorageMetadata>();

        dataClient.Should().BeOfType<DataClient>();
        dataClient.Should().NotBeAssignableTo<IDataClientWithStorageMetadata>();
        dataClient.Should().NotBeAssignableTo<IInstanceMutationClient>();

        instanceClient.Should().BeOfType<GuardedInstanceClient>();
        instanceClient.Should().NotBeAssignableTo<IInstanceClientWithStorageMetadata>();

        storageDataClient.Should().BeOfType<StorageDataClient>();
        storageDataClient.Should().BeAssignableTo<IDataClientWithStorageMetadata>();
        storageDataClient.Should().BeAssignableTo<IInstanceMutationClient>();

        storageInstanceClient.Should().BeOfType<InstanceClient>();
        storageInstanceClient.Should().BeAssignableTo<IInstanceClientWithStorageMetadata>();
        metadataInstanceClient.Should().BeOfType<InstanceClient>();
    }
}
