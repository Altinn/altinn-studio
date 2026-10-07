#nullable disable
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Infrastructure.Clients.Events;
using Altinn.App.Core.Infrastructure.Clients.Storage;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Events;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Tests.Common.Fixtures;
using Microsoft.Extensions.DependencyInjection;
using Moq;

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

        Assert.IsType<DataClient>(dataClient);
        Assert.IsAssignableFrom<IDataClientWithStorageMetadata>(dataClient);
        Assert.IsAssignableFrom<IInstanceMutationClient>(dataClient);

        Assert.IsType<DataClient>(metadataDataClient);
        Assert.IsAssignableFrom<IDataClient>(metadataDataClient);
        Assert.IsAssignableFrom<IInstanceMutationClient>(metadataDataClient);

        Assert.IsType<DataClient>(mutationClient);
        Assert.IsAssignableFrom<IDataClient>(mutationClient);
        Assert.IsAssignableFrom<IDataClientWithStorageMetadata>(mutationClient);

        Assert.IsType<InstanceClient>(instanceClient);
        Assert.IsAssignableFrom<IInstanceClientWithStorageMetadata>(instanceClient);

        Assert.IsType<InstanceClient>(metadataInstanceClient);
        Assert.IsAssignableFrom<IInstanceClient>(metadataInstanceClient);
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

        Assert.Same(dataClientMock.Object, serviceProvider.GetRequiredService<IDataClient>());
        Assert.Same(dataClientMock.Object, serviceProvider.GetRequiredService<IDataClientWithStorageMetadata>());
        Assert.Same(dataClientMock.Object, serviceProvider.GetRequiredService<IInstanceMutationClient>());
        Assert.Same(instanceClientMock.Object, serviceProvider.GetRequiredService<IInstanceClient>());
        Assert.Same(
            instanceClientMock.Object,
            serviceProvider.GetRequiredService<IInstanceClientWithStorageMetadata>()
        );
    }
}
