using Altinn.App.Api.Controllers;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Instances;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace Altinn.App.Api.Tests.Controllers;

public class FileScanControllerTests
{
    [Fact]
    public async Task InstanceAndDataExists_ShouldReturn200Ok()
    {
        const string org = "org";
        const string app = "app";
        const int instanceOwnerPartyId = 12345;
        Guid instanceId = Guid.NewGuid();
        Mock<IInstanceClient> instanceClientMock = CreateInstanceClientMock(org, app, instanceOwnerPartyId, instanceId);

        var fileScanController = new FileScanController(instanceClientMock.Object);
        var fileScanResults = await fileScanController.GetFileScanResults(org, app, instanceOwnerPartyId, instanceId);

        fileScanResults.Result.Should().BeOfType<OkObjectResult>();
        fileScanResults.Value?.FileScanResult.Should().Be(Platform.Storage.Interface.Enums.FileScanResult.Infected);
    }

    [Fact]
    public async Task InstanceDoesNotExists_ShouldReturnNotFound()
    {
        const string org = "org";
        const string app = "app";
        const int instanceOwnerPartyId = 12345;
        Guid instanceId = Guid.NewGuid();
        Mock<IInstanceClient> instanceClientMock = CreateInstanceClientMock(org, app, instanceOwnerPartyId, instanceId);

        var fileScanController = new FileScanController(instanceClientMock.Object);
        var fileScanResults = await fileScanController.GetFileScanResults(
            org,
            app,
            instanceOwnerPartyId,
            Guid.NewGuid()
        );

        fileScanResults.Result.Should().BeOfType<NotFoundResult>();
    }

    private static Mock<IInstanceClient> CreateInstanceClientMock(
        string org,
        string app,
        int instanceOwnerPartyId,
        Guid instanceId
    )
    {
        var instance = new Instance
        {
            Id = $"{instanceOwnerPartyId}/{instanceId}",
            Process = null,
            Data = new List<DataElement>()
            {
                new()
                {
                    Id = Guid.NewGuid().ToString(),
                    FileScanResult = Platform.Storage.Interface.Enums.FileScanResult.Infected,
                },
            },
        };

        var instanceClientMock = new Mock<IInstanceClient>();
        instanceClientMock
            .Setup(e =>
                e.GetInstance(
                    app,
                    org,
                    instanceOwnerPartyId,
                    instanceId,
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Returns(Task.FromResult(instance));

        return instanceClientMock;
    }
}
