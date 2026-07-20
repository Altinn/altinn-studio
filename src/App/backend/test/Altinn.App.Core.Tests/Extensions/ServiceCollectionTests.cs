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
using Moq;

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
    public async Task MockedServiceCollection_ResolvesConcreteStorageClientsThroughAllInterfaces()
    {
        var services = new MockedServiceCollection();
        await using var serviceProvider = services.BuildServiceProvider();

        var dataClient = serviceProvider.GetRequiredService<IDataClient>();
        var metadataDataClient = serviceProvider.GetRequiredService<IDataClientWithStorageMetadata>();
        var mutationClient = serviceProvider.GetRequiredService<IInstanceMutationClient>();
        var instanceClient = serviceProvider.GetRequiredService<IInstanceClient>();
        var metadataInstanceClient = serviceProvider.GetRequiredService<IInstanceClientWithStorageMetadata>();

        dataClient.Should().BeOfType<DataClient>();
        dataClient.Should().BeAssignableTo<IDataClientWithStorageMetadata>();
        dataClient.Should().BeAssignableTo<IInstanceMutationClient>();

        metadataDataClient.Should().BeOfType<DataClient>();
        metadataDataClient.Should().BeAssignableTo<IDataClient>();
        metadataDataClient.Should().BeAssignableTo<IInstanceMutationClient>();

        mutationClient.Should().BeOfType<DataClient>();
        mutationClient.Should().BeAssignableTo<IDataClient>();
        mutationClient.Should().BeAssignableTo<IDataClientWithStorageMetadata>();

        instanceClient.Should().BeOfType<InstanceClient>();
        instanceClient.Should().BeAssignableTo<IInstanceClientWithStorageMetadata>();

        metadataInstanceClient.Should().BeOfType<InstanceClient>();
        metadataInstanceClient.Should().BeAssignableTo<IInstanceClient>();
    }

    [Fact]
    public async Task MockedServiceCollection_PublicStorageClientOverridesBackAllInternalViews()
    {
        var services = new MockedServiceCollection();
        var dataClientMock = new Mock<IDataClient>();
        dataClientMock.As<IDataClientWithStorageMetadata>();
        dataClientMock.As<IInstanceMutationClient>();
        var instanceClientMock = new Mock<IInstanceClient>();
        instanceClientMock.As<IInstanceClientWithStorageMetadata>();
        services.Services.AddSingleton(dataClientMock.Object);
        services.Services.AddSingleton(instanceClientMock.Object);

        await using var serviceProvider = services.BuildServiceProvider();

        serviceProvider.GetRequiredService<IDataClient>().Should().BeSameAs(dataClientMock.Object);
        serviceProvider.GetRequiredService<IDataClientWithStorageMetadata>().Should().BeSameAs(dataClientMock.Object);
        serviceProvider.GetRequiredService<IInstanceMutationClient>().Should().BeSameAs(dataClientMock.Object);
        serviceProvider.GetRequiredService<IInstanceClient>().Should().BeSameAs(instanceClientMock.Object);
        serviceProvider
            .GetRequiredService<IInstanceClientWithStorageMetadata>()
            .Should()
            .BeSameAs(instanceClientMock.Object);
    }
}
