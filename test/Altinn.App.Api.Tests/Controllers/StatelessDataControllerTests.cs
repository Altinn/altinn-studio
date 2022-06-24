using System;
using System.Collections.Generic;
using System.Security.Claims;
using Altinn.App.Api.Controllers;
using Altinn.App.Api.Tests.Controllers.TestResources;
using Altinn.App.PlatformServices.Extensions;
using Altinn.App.Services.Interface;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Common.PEP.Interfaces;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.ApplicationInsights.DataContracts;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Primitives;
using Moq;
using Xunit;

namespace Altinn.App.Api.Tests.Controllers;

public class StatelessDataControllerTests
{
    [Fact]
    public async void Get_Returns_BadRequest_when_dataType_is_null()
    {
        // Arrange
        var altinnAppMock = new Mock<IAltinnApp>();
        var appResourcesMock = new Mock<IAppResources>();
        var prefillMock = new Mock<IPrefill>();
        var registerMock = new Mock<IRegister>();
        var pdpMock = new Mock<IPDP>();
        ILogger<DataController> logger = new NullLogger<DataController>();
        var statelessDataController = new StatelessDataController(logger, altinnAppMock.Object, appResourcesMock.Object,
            prefillMock.Object, registerMock.Object, pdpMock.Object);

        // Act
        var result = await statelessDataController.Get("ttd", "demo-app", null);

        // Assert
        result.Should().BeOfType<BadRequestObjectResult>().Which.Value.Should().Be(
            $"Invalid dataType {string.Empty} provided. Please provide a valid dataType as query parameter.");
        altinnAppMock.VerifyNoOtherCalls();
        appResourcesMock.VerifyNoOtherCalls();
        prefillMock.VerifyNoOtherCalls();
        registerMock.VerifyNoOtherCalls();
        pdpMock.VerifyNoOtherCalls();
    }

    [Fact]
    public async void Get_Returns_BadRequest_when_appResource_classRef_is_null()
    {
        // Arrange
        var altinnAppMock = new Mock<IAltinnApp>();
        var appResourcesMock = new Mock<IAppResources>();
        var prefillMock = new Mock<IPrefill>();
        var registerMock = new Mock<IRegister>();
        var pdpMock = new Mock<IPDP>();
        var dataType = "some-value";
        ILogger<DataController> logger = new NullLogger<DataController>();
        var statelessDataController = new StatelessDataController(logger, altinnAppMock.Object, appResourcesMock.Object,
            prefillMock.Object, registerMock.Object, pdpMock.Object);


        // Act
        appResourcesMock.Setup(x => x.GetClassRefForLogicDataType(dataType)).Returns(string.Empty);
        var result = await statelessDataController.Get("ttd", "demo-app", dataType);

        // Assert
        result.Should().BeOfType<BadRequestObjectResult>().Which.Value.Should().Be(
            $"Invalid dataType {dataType} provided. Please provide a valid dataType as query parameter.");
        appResourcesMock.Verify(x => x.GetClassRefForLogicDataType(dataType), Times.Once);
        appResourcesMock.VerifyNoOtherCalls();
        altinnAppMock.VerifyNoOtherCalls();
        prefillMock.VerifyNoOtherCalls();
        registerMock.VerifyNoOtherCalls();
        pdpMock.VerifyNoOtherCalls();
    }

    [Fact]
    public async void Get_Returns_BadRequest_when_party_header_count_greater_than_one()
    {
        // Arrange
        var altinnAppMock = new Mock<IAltinnApp>();
        var appResourcesMock = new Mock<IAppResources>();
        var prefillMock = new Mock<IPrefill>();
        var registerMock = new Mock<IRegister>();
        var pdpMock = new Mock<IPDP>();
        var dataType = "some-value";
        ILogger<DataController> logger = new NullLogger<DataController>();
        var statelessDataController = new StatelessDataController(logger, altinnAppMock.Object, appResourcesMock.Object,
            prefillMock.Object, registerMock.Object, pdpMock.Object);
        statelessDataController.ControllerContext = new ControllerContext();
        statelessDataController.ControllerContext.HttpContext = new DefaultHttpContext();
        statelessDataController.ControllerContext.HttpContext.Request.Headers["party"] =
            new StringValues((new[] { "12345", "67890" }));

        // Act
        appResourcesMock.Setup(x => x.GetClassRefForLogicDataType(dataType)).Returns(typeof(DummyModel).FullName);
        var result = await statelessDataController.Get("ttd", "demo-app", dataType);

        // Assert
        result.Should().BeOfType<BadRequestObjectResult>().Which.Value.Should().Be("Invalid party. Only one allowed");
        appResourcesMock.Verify(x => x.GetClassRefForLogicDataType(dataType), Times.Once);
        appResourcesMock.VerifyNoOtherCalls();
        altinnAppMock.VerifyNoOtherCalls();
        prefillMock.VerifyNoOtherCalls();
        registerMock.VerifyNoOtherCalls();
        pdpMock.VerifyNoOtherCalls();
    }

    [Fact]
    public async void Get_Returns_BadRequest_when_instance_owner_is_empty_party_header()
    {
        // Arrange
        var altinnAppMock = new Mock<IAltinnApp>();
        var appResourcesMock = new Mock<IAppResources>();
        var prefillMock = new Mock<IPrefill>();
        var registerMock = new Mock<IRegister>();
        var pdpMock = new Mock<IPDP>();
        var dataType = "some-value";
        ILogger<DataController> logger = new NullLogger<DataController>();
        var statelessDataController = new StatelessDataController(logger, altinnAppMock.Object, appResourcesMock.Object,
            prefillMock.Object, registerMock.Object, pdpMock.Object);
        statelessDataController.ControllerContext = new ControllerContext();
        statelessDataController.ControllerContext.HttpContext = new DefaultHttpContext();
        statelessDataController.ControllerContext.HttpContext.Request.Headers["party"] =
            new StringValues((new[] { string.Empty }));

        // Act
        appResourcesMock.Setup(x => x.GetClassRefForLogicDataType(dataType)).Returns(typeof(DummyModel).FullName);
        var result = await statelessDataController.Get("ttd", "demo-app", dataType);

        // Assert
        result.Should().BeOfType<StatusCodeResult>().Which.StatusCode.Should().Be(403);
        appResourcesMock.Verify(x => x.GetClassRefForLogicDataType(dataType), Times.Once);
        appResourcesMock.VerifyNoOtherCalls();
        altinnAppMock.VerifyNoOtherCalls();
        prefillMock.VerifyNoOtherCalls();
        registerMock.VerifyNoOtherCalls();
        pdpMock.VerifyNoOtherCalls();
    }

    [Fact]
    public async void Get_Returns_BadRequest_when_instance_owner_is_empty_user_in_context()
    {
        // Arrange
        var altinnAppMock = new Mock<IAltinnApp>();
        var appResourcesMock = new Mock<IAppResources>();
        var prefillMock = new Mock<IPrefill>();
        var registerMock = new Mock<IRegister>();
        var pdpMock = new Mock<IPDP>();
        var dataType = "some-value";
        ILogger<DataController> logger = new NullLogger<DataController>();
        var statelessDataController = new StatelessDataController(logger, altinnAppMock.Object, appResourcesMock.Object,
            prefillMock.Object, registerMock.Object, pdpMock.Object);
        statelessDataController.ControllerContext = new ControllerContext();
        statelessDataController.ControllerContext.HttpContext = new DefaultHttpContext();
        statelessDataController.ControllerContext.HttpContext.User = new ClaimsPrincipal(new List<ClaimsIdentity>()
        {
            new ClaimsIdentity(new List<Claim>
            {
                new Claim(
                    "urn:altinn:partyid", string.Empty, "#integer"
                )
            })
        });

        // Act
        appResourcesMock.Setup(x => x.GetClassRefForLogicDataType(dataType)).Returns(typeof(DummyModel).FullName);
        var result = await statelessDataController.Get("ttd", "demo-app", dataType);

        // Assert
        result.Should().BeOfType<StatusCodeResult>().Which.StatusCode.Should().Be(403);
        appResourcesMock.Verify(x => x.GetClassRefForLogicDataType(dataType), Times.Once);
        appResourcesMock.VerifyNoOtherCalls();
        altinnAppMock.VerifyNoOtherCalls();
        prefillMock.VerifyNoOtherCalls();
        registerMock.VerifyNoOtherCalls();
        pdpMock.VerifyNoOtherCalls();
    }
    
    [Fact]
    public async void Get_Returns_Forbidden_when_returned_descision_is_Deny()
    {
        // Arrange
        var altinnAppMock = new Mock<IAltinnApp>();
        var appResourcesMock = new Mock<IAppResources>();
        var prefillMock = new Mock<IPrefill>();
        var registerMock = new Mock<IRegister>();
        var pdpMock = new Mock<IPDP>();
        var dataType = "some-value";
        ILogger<DataController> logger = new NullLogger<DataController>();
        var statelessDataController = new StatelessDataController(logger, altinnAppMock.Object, appResourcesMock.Object,
            prefillMock.Object, registerMock.Object, pdpMock.Object);
        statelessDataController.ControllerContext = new ControllerContext();
        statelessDataController.ControllerContext.HttpContext = new DefaultHttpContext();
        statelessDataController.ControllerContext.HttpContext.User = new ClaimsPrincipal(new List<ClaimsIdentity>()
        {
            new ClaimsIdentity(new List<Claim>
            {
                new Claim(
                    "urn:altinn:partyid", "12345", "#integer"
                )
            })
        });
        pdpMock.Setup(p => p.GetDecisionForRequest(It.IsAny<XacmlJsonRequestRoot>()))
            .ReturnsAsync(new XacmlJsonResponse()
            {
                Response = new List<XacmlJsonResult>()
                {
                    new XacmlJsonResult()
                    {
                        Decision = XacmlContextDecision.Deny.ToString()
                    }
                }
            });

        // Act
        appResourcesMock.Setup(x => x.GetClassRefForLogicDataType(dataType)).Returns(typeof(DummyModel).FullName);
        var result = await statelessDataController.Get("ttd", "demo-app", dataType);

        // Assert
        result.Should().BeOfType<StatusCodeResult>().Which.StatusCode.Should().Be(403);
        appResourcesMock.Verify(x => x.GetClassRefForLogicDataType(dataType), Times.Once);
        appResourcesMock.VerifyNoOtherCalls();
        pdpMock.Verify(p => p.GetDecisionForRequest(It.IsAny<XacmlJsonRequestRoot>()));
        pdpMock.VerifyNoOtherCalls();
        altinnAppMock.VerifyNoOtherCalls();
        prefillMock.VerifyNoOtherCalls();
        registerMock.VerifyNoOtherCalls();
    }
    
    [Fact]
    public async void Get_Returns_OK_with_appModel()
    {
        // Arrange
        var altinnAppMock = new Mock<IAltinnApp>();
        var appResourcesMock = new Mock<IAppResources>();
        var prefillMock = new Mock<IPrefill>();
        var registerMock = new Mock<IRegister>();
        var pdpMock = new Mock<IPDP>();
        var dataType = "some-value";
        var classRef = typeof(DummyModel).FullName;
        ILogger<DataController> logger = new NullLogger<DataController>();
        var statelessDataController = new StatelessDataController(logger, altinnAppMock.Object, appResourcesMock.Object,
            prefillMock.Object, registerMock.Object, pdpMock.Object);
        statelessDataController.ControllerContext = new ControllerContext();
        statelessDataController.ControllerContext.HttpContext = new DefaultHttpContext();
        statelessDataController.ControllerContext.HttpContext.User = new ClaimsPrincipal(new List<ClaimsIdentity>()
        {
            new ClaimsIdentity(new List<Claim>
            {
                new Claim(
                    "urn:altinn:partyid", "12345", "#integer"
                )
            })
        });
        pdpMock.Setup(p => p.GetDecisionForRequest(It.IsAny<XacmlJsonRequestRoot>()))
            .ReturnsAsync(new XacmlJsonResponse()
            {
                Response = new List<XacmlJsonResult>()
                {
                    new XacmlJsonResult()
                    {
                        Decision = XacmlContextDecision.Permit.ToString()
                    }
                }
            });
        altinnAppMock.Setup(a => a.CreateNewAppModel(classRef))
            .Returns(new DummyModel());

        // Act
        appResourcesMock.Setup(x => x.GetClassRefForLogicDataType(dataType)).Returns(classRef);
        var result = await statelessDataController.Get("ttd", "demo-app", dataType);

        // Assert
        result.Should().BeOfType<OkObjectResult>().Which.StatusCode.Should().Be(200);
        result.Should().BeOfType<OkObjectResult>().Which.Value.Should().BeOfType<DummyModel>();
        appResourcesMock.Verify(x => x.GetClassRefForLogicDataType(dataType), Times.Once);
        pdpMock.Verify(p => p.GetDecisionForRequest(It.IsAny<XacmlJsonRequestRoot>()));
        altinnAppMock.Verify(a => a.CreateNewAppModel(classRef), Times.Once);
        prefillMock.Verify(p => p.PrefillDataModel("12345", dataType, It.IsAny<DummyModel>(), null));
        altinnAppMock.Verify(a => a.RunProcessDataRead(It.IsAny<Instance>(), null, It.IsAny<DummyModel>()));
        appResourcesMock.VerifyNoOtherCalls();
        pdpMock.VerifyNoOtherCalls();
        altinnAppMock.VerifyNoOtherCalls();
        prefillMock.VerifyNoOtherCalls();
        registerMock.VerifyNoOtherCalls();
    }
}