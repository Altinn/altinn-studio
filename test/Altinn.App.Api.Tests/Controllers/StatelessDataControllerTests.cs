using System.Collections.Generic;
using System.Net.Http.Headers;
using System.Security.Claims;
using Altinn.App.Api.Controllers;
using Altinn.App.Api.Tests.Controllers.TestResources;
using Altinn.App.Api.Tests.Utils;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.DataProcessing;
using Altinn.App.Core.Infrastructure.Clients.Profile;
using Altinn.App.Core.Interface;
using Altinn.App.Core.Internal.AppModel;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Common.PEP.Interfaces;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Xunit;

namespace Altinn.App.Api.Tests.Controllers;

public class StatelessDataControllerTests
{
    [Fact]
    public async void Get_Returns_BadRequest_when_dataType_is_null()
    {
        // Arrange
        var altinnAppModelMock = new Mock<IAppModel>();
        var appResourcesMock = new Mock<IAppResources>();
        var dataProcessorMock = new Mock<IDataProcessor>();
        var prefillMock = new Mock<IPrefill>();
        var registerMock = new Mock<IRegister>();
        var pdpMock = new Mock<IPDP>();
        ILogger<DataController> logger = new NullLogger<DataController>();
        var statelessDataController = new StatelessDataController(logger, altinnAppModelMock.Object, appResourcesMock.Object,
            dataProcessorMock.Object, prefillMock.Object, registerMock.Object, pdpMock.Object);

        string dataType = null!; // this is what we're testing

        // Act
        var result = await statelessDataController.Get("ttd", "demo-app", dataType, "partyId:123");

        // Assert
        result.Should().BeOfType<BadRequestObjectResult>().Which.Value.Should().Be(
            $"Invalid dataType {string.Empty} provided. Please provide a valid dataType as query parameter.");
        dataProcessorMock.VerifyNoOtherCalls();
        appResourcesMock.VerifyNoOtherCalls();
        prefillMock.VerifyNoOtherCalls();
        registerMock.VerifyNoOtherCalls();
        pdpMock.VerifyNoOtherCalls();
    }

    [Fact]
    public async void Get_Returns_BadRequest_when_appResource_classRef_is_null()
    {
        // Arrange
        var appModelMock = new Mock<IAppModel>();
        var appResourcesMock = new Mock<IAppResources>();
        var dataProcessorMock = new Mock<IDataProcessor>();
        var prefillMock = new Mock<IPrefill>();
        var registerMock = new Mock<IRegister>();
        var pdpMock = new Mock<IPDP>();
        var dataType = "some-value";
        ILogger<DataController> logger = new NullLogger<DataController>();
        var statelessDataController = new StatelessDataController(logger, appModelMock.Object, appResourcesMock.Object,
            dataProcessorMock.Object, prefillMock.Object, registerMock.Object, pdpMock.Object);


        // Act
        appResourcesMock.Setup(x => x.GetClassRefForLogicDataType(dataType)).Returns(string.Empty);
        var result = await statelessDataController.Get("ttd", "demo-app", dataType, "partyId:123");

        // Assert
        result.Should().BeOfType<BadRequestObjectResult>().Which.Value.Should().Be(
            $"Invalid dataType {dataType} provided. Please provide a valid dataType as query parameter.");
        appResourcesMock.Verify(x => x.GetClassRefForLogicDataType(dataType), Times.Once);
        appResourcesMock.VerifyNoOtherCalls();
        dataProcessorMock.VerifyNoOtherCalls();
        prefillMock.VerifyNoOtherCalls();
        registerMock.VerifyNoOtherCalls();
        pdpMock.VerifyNoOtherCalls();
    }

    // WebApplicationFactory that allows testing how things work when the user has two
    // party headers.
    private class StatelessDataControllerWebApplicationFactory : WebApplicationFactory<Program>
    {
        public Mock<IProfile> ProfileClientMoq { get; set; } = new();
        public Mock<IRegister> RegisterClientMoq { get; set; } = new();
        public Mock<IAppResources> AppResourcesMoq { get; set; } = new();

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            base.ConfigureWebHost(builder);

            builder.ConfigureServices(services=>
            {
                services.AddTransient<IProfile>((sp)=>ProfileClientMoq.Object);
                services.AddTransient<IRegister>((sp)=>RegisterClientMoq.Object);
                services.AddTransient<IAppResources>((sp)=>AppResourcesMoq.Object);
            });
        }
    }

    [Fact]
    public async void Get_Returns_BadRequest_when_party_header_count_greater_than_one()
    {
        // Arrange
        var factory = new StatelessDataControllerWebApplicationFactory();
        
        var client = factory.CreateClient();
        string token = PrincipalUtil.GetToken(1337);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        using var request = new HttpRequestMessage(HttpMethod.Get, "/tdd/demo-app/v1/data?dataType=xml");
        request.Headers.Add("party", new string[]{"partyid:234", "partyid:234"}); // Double header

        factory.AppResourcesMoq.Setup(ar=>ar.GetClassRefForLogicDataType(It.IsAny<string>())).Returns("Not.In.Valid.Namespace.ClassRef");
        factory.RegisterClientMoq.Setup(p=>p.GetParty(234)).ReturnsAsync(new Platform.Register.Models.Party
        {
            PartyId = 234,
        });

        // Act
        var response = await client.SendAsync(request);
        var responseText = await response.Content.ReadAsStringAsync();

        // Assert
        response.StatusCode.Should().Be(System.Net.HttpStatusCode.BadRequest);
        responseText.Should().Contain("Invalid party header.");
    }
    
    [Fact]
    public async void Get_Returns_Forbidden_when_party_has_no_rights()
    {
        // Arrange
        var factory = new StatelessDataControllerWebApplicationFactory();
        
        var client = factory.CreateClient();
        string token = PrincipalUtil.GetToken(1337);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        using var request = new HttpRequestMessage(HttpMethod.Get, "/tdd/demo-app/v1/data?dataType=xml");
        request.Headers.Add("party", new string[]{"partyid:234"});

        factory.AppResourcesMoq.Setup(ar=>ar.GetClassRefForLogicDataType(It.IsAny<string>())).Returns("Not.In.Valid.Namespace.ClassRef");
        factory.RegisterClientMoq.Setup(p=>p.GetParty(234)).ReturnsAsync(new Platform.Register.Models.Party
        {
            PartyId = 234,
        });


        // Act
        var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(System.Net.HttpStatusCode.Forbidden);
    }

    [Fact]
    public async void Get_Returns_BadRequest_when_instance_owner_is_empty_party_header()
    {
        // Arrange
        var appModelMock = new Mock<IAppModel>();
        var appResourcesMock = new Mock<IAppResources>();
        var dataProcessorMock = new Mock<IDataProcessor>();
        var prefillMock = new Mock<IPrefill>();
        var registerMock = new Mock<IRegister>();
        var pdpMock = new Mock<IPDP>();
        var dataType = "some-value";
        ILogger<DataController> logger = new NullLogger<DataController>();
        var statelessDataController = new StatelessDataController(logger, appModelMock.Object, appResourcesMock.Object,
            dataProcessorMock.Object, prefillMock.Object, registerMock.Object, pdpMock.Object);

        // Act
        appResourcesMock.Setup(x => x.GetClassRefForLogicDataType(dataType)).Returns(typeof(DummyModel).FullName!);
        var result = await statelessDataController.Get("ttd", "demo-app", dataType, string.Empty);

        // Assert
        var response = result.Should().BeOfType<BadRequestObjectResult>().Which;
        response.StatusCode.Should().Be(400);
        response.Value.Should().BeOfType<string>().Which.Should().Contain("Invalid party header.");
        appResourcesMock.Verify(x => x.GetClassRefForLogicDataType(dataType), Times.Once);
        appResourcesMock.VerifyNoOtherCalls();
        dataProcessorMock.VerifyNoOtherCalls();
        prefillMock.VerifyNoOtherCalls();
        registerMock.VerifyNoOtherCalls();
        pdpMock.VerifyNoOtherCalls();
    }

    [Fact]
    public async void Get_Returns_BadRequest_when_instance_owner_is_empty_user_in_context()
    {
        // Arrange
        var appModelMock = new Mock<IAppModel>();
        var appResourcesMock = new Mock<IAppResources>();
        var dataProcessorMock = new Mock<IDataProcessor>();
        var prefillMock = new Mock<IPrefill>();
        var registerMock = new Mock<IRegister>();
        var pdpMock = new Mock<IPDP>();
        var dataType = "some-value";
        ILogger<DataController> logger = new NullLogger<DataController>();
        var statelessDataController = new StatelessDataController(logger, appModelMock.Object, appResourcesMock.Object,
            dataProcessorMock.Object, prefillMock.Object, registerMock.Object, pdpMock.Object);
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
        appResourcesMock.Setup(x => x.GetClassRefForLogicDataType(dataType)).Returns(typeof(DummyModel).FullName!);
        var result = await statelessDataController.Get("ttd", "demo-app", dataType, null!);

        // Assert
        result.Should().BeOfType<BadRequestObjectResult>().Which.StatusCode.Should().Be(400);
        appResourcesMock.Verify(x => x.GetClassRefForLogicDataType(dataType), Times.Once);
        appResourcesMock.VerifyNoOtherCalls();
        dataProcessorMock.VerifyNoOtherCalls();
        prefillMock.VerifyNoOtherCalls();
        registerMock.VerifyNoOtherCalls();
        pdpMock.VerifyNoOtherCalls();
    }
    
    [Fact]
    public async void Get_Returns_Forbidden_when_returned_descision_is_Deny()
    {
        // Arrange
        var appModelMock = new Mock<IAppModel>();
        var appResourcesMock = new Mock<IAppResources>();
        var dataProcessorMock = new Mock<IDataProcessor>();
        var prefillMock = new Mock<IPrefill>();
        var registerMock = new Mock<IRegister>();
        var pdpMock = new Mock<IPDP>();
        var dataType = "some-value";
        ILogger<DataController> logger = new NullLogger<DataController>();
        var statelessDataController = new StatelessDataController(logger, appModelMock.Object, appResourcesMock.Object,
            dataProcessorMock.Object, prefillMock.Object, registerMock.Object, pdpMock.Object);
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
        registerMock.Setup(r=>r.GetParty(12345)).ReturnsAsync(new Platform.Register.Models.Party
        {
            PartyId = 12345,
        });

        // Act
        appResourcesMock.Setup(x => x.GetClassRefForLogicDataType(dataType)).Returns(typeof(DummyModel).FullName!);
        var result = await statelessDataController.Get("ttd", "demo-app", dataType, null!);

        // Assert
        result.Should().BeOfType<StatusCodeResult>().Which.StatusCode.Should().Be(403);
        appResourcesMock.Verify(x => x.GetClassRefForLogicDataType(dataType), Times.Once);
        appResourcesMock.VerifyNoOtherCalls();
        registerMock.Verify(r=>r.GetParty(12345));
        pdpMock.Verify(p => p.GetDecisionForRequest(It.IsAny<XacmlJsonRequestRoot>()));
        pdpMock.VerifyNoOtherCalls();
        dataProcessorMock.VerifyNoOtherCalls();
        prefillMock.VerifyNoOtherCalls();
        registerMock.VerifyNoOtherCalls();
    }
    
    [Fact]
    public async void Get_Returns_OK_with_appModel()
    {
        // Arrange
        var appModelMock = new Mock<IAppModel>();
        var appResourcesMock = new Mock<IAppResources>();
        var dataProcessorMock = new Mock<IDataProcessor>();
        var prefillMock = new Mock<IPrefill>();
        var registerMock = new Mock<IRegister>();
        var pdpMock = new Mock<IPDP>();
        var dataType = "some-value";
        var classRef = typeof(DummyModel).FullName!;
        ILogger<DataController> logger = new NullLogger<DataController>();
        var statelessDataController = new StatelessDataController(logger, appModelMock.Object, appResourcesMock.Object,
            dataProcessorMock.Object, prefillMock.Object, registerMock.Object, pdpMock.Object);
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
        appModelMock.Setup(a => a.Create(classRef))
            .Returns(new DummyModel());
        registerMock.Setup(r=>r.GetParty(12345)).ReturnsAsync(new Platform.Register.Models.Party
        {
            PartyId = 12345,
        });

        // Act
        appResourcesMock.Setup(x => x.GetClassRefForLogicDataType(dataType)).Returns(classRef);
        var result = await statelessDataController.Get("ttd", "demo-app", dataType, null!);

        // Assert
        result.Should().BeOfType<OkObjectResult>().Which.StatusCode.Should().Be(200);
        result.Should().BeOfType<OkObjectResult>().Which.Value.Should().BeOfType<DummyModel>();
        appResourcesMock.Verify(x => x.GetClassRefForLogicDataType(dataType), Times.Once);
        pdpMock.Verify(p => p.GetDecisionForRequest(It.IsAny<XacmlJsonRequestRoot>()));
        appModelMock.Verify(a => a.Create(classRef), Times.Once);
        prefillMock.Verify(p => p.PrefillDataModel("12345", dataType, It.IsAny<DummyModel>(), null));
        dataProcessorMock.Verify(a => a.ProcessDataRead(It.IsAny<Instance>(), null, It.IsAny<DummyModel>()));
        registerMock.Verify(r=>r.GetParty(12345));
        appResourcesMock.VerifyNoOtherCalls();
        pdpMock.VerifyNoOtherCalls();
        dataProcessorMock.VerifyNoOtherCalls();
        prefillMock.VerifyNoOtherCalls();
        registerMock.VerifyNoOtherCalls();
    }
}