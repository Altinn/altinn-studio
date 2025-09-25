using Altinn.App.Api.Controllers;
using Altinn.App.Api.Tests.Controllers.TestResources;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace Altinn.App.Api.Tests.Controllers;

public class StatelessPagesControllerTests
{
    private const string org = "ttd";
    private const string app = "unittest-app";
    private const string layoutSetId = "layoutset";
    private const string currentpage = "pageone";
    private const string formdata = "{\"Name\":\"test\",\"Age\":\"20\"}";

    [Fact]
    public async Task GetPageOrder_Returns_page_order_from_IPageOrder()
    {
        // Arrange
        var appResourcesMock = new Mock<IAppResources>();
        var pageOrderMock = new Mock<IPageOrder>();
        var appModelMock = new Mock<IAppModel>();
        const string dataTypeId = "DummyModel";
        string classRef = typeof(DummyModel).FullName!;
        List<string> expected = new List<string> { "pagetwo", "pagethree" };
        Type type = typeof(DummyModel);
        appResourcesMock.Setup(r => r.GetClassRefForLogicDataType(dataTypeId)).Returns(classRef);
        appModelMock.Setup(a => a.GetModelType(classRef)).Returns(type);
        pageOrderMock
            .Setup(p =>
                p.GetPageOrder(
                    It.IsAny<AppIdentifier>(),
                    InstanceIdentifier.NoInstance,
                    layoutSetId,
                    currentpage,
                    dataTypeId,
                    new DummyModel() { Name = "test", Age = 20 }
                )
            )
            .Returns(Task.FromResult(new List<string> { "pagetwo", "pagethree" }));

        var controller = new StatelessPagesController(
            appModelMock.Object,
            appResourcesMock.Object,
            pageOrderMock.Object
        );

        // Act

        var result = await controller.GetPageOrder(org, app, layoutSetId, currentpage, dataTypeId, formdata);

        // Assert
        result.Value.Should().BeEquivalentTo(expected);
    }

    [Fact]
    public async Task GetPageOrder_Returns_BadRequest_when_datatype_null()
    {
        // Arrange
        var appResourcesMock = new Mock<IAppResources>();
        var pageOrderMock = new Mock<IPageOrder>();
        var appModelMock = new Mock<IAppModel>();
        var controller = new StatelessPagesController(
            appModelMock.Object,
            appResourcesMock.Object,
            pageOrderMock.Object
        );

        // Act
        var response = await controller.GetPageOrder(org, app, layoutSetId, currentpage, null, formdata);

        // Assert
        response.Result.Should().BeOfType<BadRequestObjectResult>();
        appResourcesMock.VerifyNoOtherCalls();
        pageOrderMock.VerifyNoOtherCalls();
        appModelMock.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task GetPageOrder_Returns_BadRequest_when_datatype_empty()
    {
        // Arrange
        var appResourcesMock = new Mock<IAppResources>();
        var pageOrderMock = new Mock<IPageOrder>();
        var appModelMock = new Mock<IAppModel>();
        var controller = new StatelessPagesController(
            appModelMock.Object,
            appResourcesMock.Object,
            pageOrderMock.Object
        );

        // Act
        var response = await controller.GetPageOrder(org, app, layoutSetId, currentpage, string.Empty, formdata);

        // Assert
        response.Result.Should().BeOfType<BadRequestObjectResult>();
        appResourcesMock.VerifyNoOtherCalls();
        pageOrderMock.VerifyNoOtherCalls();
        appModelMock.VerifyNoOtherCalls();
    }
}
