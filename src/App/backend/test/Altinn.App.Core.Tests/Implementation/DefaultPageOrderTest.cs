#nullable disable
using Altinn.App.Core.Features.PageOrder;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models;
using Moq;

namespace Altinn.App.PlatformServices.Tests.Implementation;

public class DefaultPageOrderTest
{
    private readonly Mock<IAppResources> appResourcesMock;

    public DefaultPageOrderTest()
    {
        appResourcesMock = new Mock<IAppResources>();
    }

    [Fact]
    public async Task GetPageOrder_Returns_LayoutSettingsForSet_when_layoutSetId_is_defined()
    {
        // Arrange
        AppIdentifier appIdentifier = new AppIdentifier("ttd", "best-app");
        Guid guid = Guid.NewGuid();
        InstanceIdentifier instanceIdentifier = InstanceIdentifier.NoInstance;
        string layoutSetId = "layoutSetId";
        string currentPage = "page1";
        string dataTypeId = "dataTypeId";
        object formData = new object();

        List<string> expected = new List<string> { "page2", "page3" };
        appResourcesMock
            .Setup(ar => ar.GetLayoutSettingsForSet(layoutSetId))
            .Returns(new LayoutSettings { Pages = new Pages { Order = expected } });

        // Act
        DefaultPageOrder target = new DefaultPageOrder(appResourcesMock.Object);

        List<string> actual = await target.GetPageOrder(
            appIdentifier,
            instanceIdentifier,
            layoutSetId,
            currentPage,
            dataTypeId,
            formData
        );

        // Assert
        Assert.Equal(expected, actual);
        appResourcesMock.Verify(ar => ar.GetLayoutSettingsForSet(layoutSetId), Times.Once);
        appResourcesMock.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task GetPageOrder_Returns_LayoutSettings_layoutSetId_is_null()
    {
        // Arrange
        AppIdentifier appIdentifier = new AppIdentifier("ttd", "best-app");
        Guid guid = Guid.NewGuid();
        InstanceIdentifier instanceIdentifier = InstanceIdentifier.NoInstance;
        string layoutSetId = null;
        string currentPage = "page1";
        string dataTypeId = "dataTypeId";
        object formData = new object();

        List<string> expected = new List<string> { "page2", "page3" };
        appResourcesMock
            .Setup(ar => ar.GetLayoutSettings())
            .Returns(new LayoutSettings { Pages = new Pages { Order = expected } });

        // Act
        DefaultPageOrder target = new DefaultPageOrder(appResourcesMock.Object);

        List<string> actual = await target.GetPageOrder(
            appIdentifier,
            instanceIdentifier,
            layoutSetId,
            currentPage,
            dataTypeId,
            formData
        );

        // Assert
        Assert.Equal(expected, actual);
        appResourcesMock.Verify(ar => ar.GetLayoutSettings(), Times.Once);
        appResourcesMock.VerifyNoOtherCalls();
    }
}
