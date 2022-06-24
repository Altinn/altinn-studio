using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.App.Api.Controllers;
using Altinn.App.Api.Tests.Controllers.TestResources;
using Altinn.App.PlatformServices.Models;
using Altinn.App.Services.Interface;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

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
        var altinnAppMock = new Mock<IAltinnApp>();
        const string dataTypeId = "DummyModel";
        string classRef = typeof(DummyModel).FullName;
        List<string> expected = new List<string> { "pagetwo", "pagethree" };
        Type type = typeof(DummyModel);
        appResourcesMock.Setup(r => r.GetClassRefForLogicDataType(dataTypeId))
            .Returns(classRef);
        altinnAppMock.Setup(a => a.GetAppModelType(classRef)).Returns(type);
        pageOrderMock.Setup(p =>
                p.GetPageOrder(
                    It.IsAny<AppIdentifier>(),
                    InstanceIdentifier.NoInstance,
                    layoutSetId,
                    currentpage,
                    dataTypeId,
                    new DummyModel()
                    {
                        Name = "test",
                        Age = 20
                    }
                ))
            .Returns(
                Task.FromResult(
                    new List<string>
                    {
                        "pagetwo",
                        "pagethree"
                    }
                ));

        var controller = new StatelessPagesController(
            altinnAppMock.Object,
            appResourcesMock.Object,
            pageOrderMock.Object);

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
        var altinnAppMock = new Mock<IAltinnApp>();
        var controller = new StatelessPagesController(
            altinnAppMock.Object,
            appResourcesMock.Object,
            pageOrderMock.Object
        );
        
        // Act
        var response = await controller.GetPageOrder(org, app, layoutSetId, currentpage, null, formdata);
        
        // Assert
        response.Result.Should().BeOfType<BadRequestObjectResult>();
        appResourcesMock.VerifyNoOtherCalls();
        pageOrderMock.VerifyNoOtherCalls();
        altinnAppMock.VerifyNoOtherCalls();
    }
    
    [Fact]
    public async Task GetPageOrder_Returns_BadRequest_when_datatype_empty()
    {
        // Arrange
        var appResourcesMock = new Mock<IAppResources>();
        var pageOrderMock = new Mock<IPageOrder>();
        var altinnAppMock = new Mock<IAltinnApp>();
        var controller = new StatelessPagesController(
            altinnAppMock.Object,
            appResourcesMock.Object,
            pageOrderMock.Object
        );
        
        // Act
        var response = await controller.GetPageOrder(org, app, layoutSetId, currentpage, string.Empty, formdata);
        
        // Assert
        response.Result.Should().BeOfType<BadRequestObjectResult>();
        appResourcesMock.VerifyNoOtherCalls();
        pageOrderMock.VerifyNoOtherCalls();
        altinnAppMock.VerifyNoOtherCalls();
    }
}