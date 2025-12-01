using Altinn.App.Clients.Fiks.FiksArkiv;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Altinn.App.Clients.Fiks.Tests.FiksArkiv;

public class FiksArkivConfigValidationServiceTest
{
    [Fact]
    public async Task StartAsync_PerformsValidations()
    {
        // Arrange
        var fiksArkivHostMock = new Mock<IFiksArkivHost>();
        var fiksArkivInstanceClientMock = new Mock<IFiksArkivInstanceClient>();
        var appMetadataMock = new Mock<IAppMetadata>();

        appMetadataMock.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(new ApplicationMetadata("ttd/test-app"));
        fiksArkivHostMock
            .Setup(x =>
                x.ValidateConfiguration(It.IsAny<IReadOnlyList<DataType>>(), It.IsAny<IReadOnlyList<ProcessTask>>())
            )
            .Verifiable(Times.Once);
        fiksArkivInstanceClientMock
            .Setup(x => x.GetServiceOwnerToken(It.IsAny<CancellationToken>()))
            .Verifiable(Times.Once);

        var fiksArkivConfigValidationService = new FiksArkivConfigValidationService(
            fiksArkivHostMock.Object,
            fiksArkivInstanceClientMock.Object,
            Mock.Of<IProcessReader>(),
            appMetadataMock.Object
        );

        // Act
        await fiksArkivConfigValidationService.StartAsync(CancellationToken.None);

        // Assert
        fiksArkivHostMock.Verify();
        fiksArkivInstanceClientMock.Verify();
    }
}
