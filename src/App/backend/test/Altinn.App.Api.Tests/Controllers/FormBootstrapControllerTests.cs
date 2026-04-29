using System.Security.Claims;
using Altinn.App.Api.Controllers;
using Altinn.App.Api.Tests.Controllers.TestResources;
using Altinn.App.Api.Tests.Mocks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Features.Bootstrap;
using Altinn.App.Core.Features.Bootstrap.Models;
using Altinn.App.Core.Features.Options;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Prefill;
using Altinn.App.Core.Internal.Validation;
using Altinn.App.Core.Models;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Common.PEP.Interfaces;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;

namespace Altinn.App.Api.Tests.Controllers;

public class FormBootstrapControllerTests
{
    [Fact]
    public async Task GetInstanceFormBootstrap_MultipleMatchingDataElementsWithoutDataElementId_ReturnsBadRequest()
    {
        var instance = new Instance
        {
            Id = "500600/6d5f7e95-5eb0-4d54-b8a0-1aa6f8511111",
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_1" } },
            Data =
            [
                new DataElement { Id = "first", DataType = "model" },
                new DataElement { Id = "second", DataType = "model" },
            ],
        };

        var instanceClient = new Mock<IInstanceClient>();
        instanceClient.Setup(x => x.GetInstance("app", "org", 500600, It.IsAny<Guid>())).ReturnsAsync(instance);

        var appResources = new Mock<IAppResources>();
        appResources
            .Setup(x => x.GetUiConfiguration())
            .Returns(
                new UiConfiguration
                {
                    Folders = new Dictionary<string, LayoutSettings>
                    {
                        ["Task_1"] = new() { DefaultDataType = "model" },
                    },
                }
            );

        var controller = CreateController(instanceClient.Object, appResources.Object);

        var result = await controller.GetInstanceFormBootstrap("org", "app", 500600, Guid.NewGuid(), "Task_1");

        var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
        var problemDetails = Assert.IsType<ProblemDetails>(badRequest.Value);
        Assert.Equal(StatusCodes.Status400BadRequest, problemDetails.Status);
        Assert.Equal("Missing data element ID", problemDetails.Title);
        Assert.Equal(
            "'dataElementId' is a required argument when multiple data elements of type 'model' exist on the instance.",
            problemDetails.Detail
        );
    }

    [Fact]
    public async Task GetStatelessFormBootstrap_MalformedPrefillJson_ReturnsBadRequest()
    {
        var appResources = new Mock<IAppResources>();
        appResources
            .Setup(x => x.GetUiConfiguration())
            .Returns(
                new UiConfiguration
                {
                    Folders = new Dictionary<string, LayoutSettings>
                    {
                        ["stateless"] = new() { DefaultDataType = "model" },
                    },
                }
            );

        var controller = CreateController(Mock.Of<IInstanceClient>(), appResources.Object);

        var result = await controller.GetStatelessFormBootstrap(
            "org",
            "app",
            "stateless",
            language: "nb",
            prefill: "{bad"
        );

        var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
        var problemDetails = Assert.IsType<ProblemDetails>(badRequest.Value);
        Assert.Equal(StatusCodes.Status400BadRequest, problemDetails.Status);
        Assert.Equal("Invalid prefill JSON", problemDetails.Title);
        Assert.Equal(
            "The 'prefill' query parameter must be a valid JSON object with string values, optionally keyed by data type.",
            problemDetails.Detail
        );
    }

    [Fact]
    public async Task GetStatelessFormBootstrap_AnonymousUser_WhenReferencedDataTypeDisallowsAnonymous_ReturnsForbidden()
    {
        var appResources = new Mock<IAppResources>();
        appResources
            .Setup(x => x.GetUiConfiguration())
            .Returns(
                new UiConfiguration
                {
                    Folders = new Dictionary<string, LayoutSettings>
                    {
                        ["stateless"] = new() { DefaultDataType = "model" },
                    },
                }
            );
        appResources
            .Setup(x => x.GetLayoutsInFolder("stateless"))
            .Returns(
                """
                {
                    "page1": {
                        "data": {
                            "layout": [
                                {
                                    "id": "field1",
                                    "type": "Input",
                                    "dataModelBindings": {
                                        "simpleBinding": {
                                            "field": "Name",
                                            "dataType": "restricted"
                                        }
                                    }
                                }
                            ]
                        }
                    }
                }
                """
            );
        appResources
            .Setup(x => x.GetLayoutSettingsForFolder("stateless"))
            .Returns(new LayoutSettings { DefaultDataType = "model" });
        appResources.Setup(x => x.GetModelJsonSchema(It.IsAny<string>())).Returns("{}");
        appResources.Setup(x => x.GetValidationConfiguration(It.IsAny<string>())).Returns((string?)null);

        var appMetadata = new ApplicationMetadata("org/app")
        {
            DataTypes =
            [
                new DataType
                {
                    Id = "model",
                    AppLogic = new() { ClassRef = typeof(DummyModel).FullName, AllowAnonymousOnStateless = true },
                },
                new DataType
                {
                    Id = "restricted",
                    AppLogic = new() { ClassRef = typeof(DummyModel).FullName, AllowAnonymousOnStateless = false },
                },
            ],
        };

        var controller = CreateController(Mock.Of<IInstanceClient>(), appResources.Object, appMetadata: appMetadata);

        var result = await controller.GetStatelessFormBootstrap("org", "app", "stateless");

        Assert.IsType<ForbidResult>(result.Result);
    }

    [Fact]
    public async Task GetStatelessFormBootstrap_AuthenticatedUserWithoutReadAccess_ReturnsForbidden()
    {
        var appResources = CreateStatelessAppResources();
        var authContext = new Mock<IAuthenticationContext>();
        authContext.Setup(x => x.Current).Returns(TestAuthentication.GetUserAuthentication(userPartyId: 501337));

        var pdp = new Mock<IPDP>();
        pdp.Setup(x => x.GetDecisionForRequest(It.IsAny<XacmlJsonRequestRoot>())).ReturnsAsync(new XacmlJsonResponse());

        var controller = CreateController(
            Mock.Of<IInstanceClient>(),
            appResources.Object,
            authContext.Object,
            pdp.Object,
            user: TestAuthentication.GetUserPrincipal(partyId: 501337),
            appMetadata: CreateStatelessAppMetadata(allowAnonymousOnStateless: false)
        );

        var result = await controller.GetStatelessFormBootstrap("org", "app", "stateless");

        var forbidden = Assert.IsType<StatusCodeResult>(result.Result);
        Assert.Equal(StatusCodes.Status403Forbidden, forbidden.StatusCode);
        pdp.Verify(x => x.GetDecisionForRequest(It.IsAny<XacmlJsonRequestRoot>()), Times.Once);
    }

    [Fact]
    public async Task GetStatelessFormBootstrap_AuthenticatedUserWithReadAccess_ReturnsOk()
    {
        var appResources = CreateStatelessAppResources();
        var authContext = new Mock<IAuthenticationContext>();
        authContext.Setup(x => x.Current).Returns(TestAuthentication.GetUserAuthentication(userPartyId: 501337));

        var pdp = new Mock<IPDP>();
        pdp.Setup(x => x.GetDecisionForRequest(It.IsAny<XacmlJsonRequestRoot>()))
            .ReturnsAsync(
                new XacmlJsonResponse { Response = [new() { Decision = XacmlContextDecision.Permit.ToString() }] }
            );

        var controller = CreateController(
            Mock.Of<IInstanceClient>(),
            appResources.Object,
            authContext.Object,
            pdp.Object,
            user: TestAuthentication.GetUserPrincipal(partyId: 501337),
            appMetadata: CreateStatelessAppMetadata(allowAnonymousOnStateless: false)
        );

        var result = await controller.GetStatelessFormBootstrap("org", "app", "stateless");

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.IsType<FormBootstrapResponse>(ok.Value);
        pdp.Verify(x => x.GetDecisionForRequest(It.IsAny<XacmlJsonRequestRoot>()), Times.Once);
    }

    [Fact]
    public async Task GetStatelessFormBootstrap_AuthenticatedUser_AnonymousFolder_DoesNotRequireReadAccess()
    {
        var appResources = CreateStatelessAppResources();
        var authContext = new Mock<IAuthenticationContext>();
        authContext.Setup(x => x.Current).Returns(TestAuthentication.GetUserAuthentication(userPartyId: 501337));

        var pdp = new Mock<IPDP>(MockBehavior.Strict);
        var controller = CreateController(
            Mock.Of<IInstanceClient>(),
            appResources.Object,
            authContext.Object,
            pdp.Object,
            user: TestAuthentication.GetUserPrincipal(partyId: 501337)
        );

        var result = await controller.GetStatelessFormBootstrap("org", "app", "stateless");

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.IsType<FormBootstrapResponse>(ok.Value);
        pdp.Verify(x => x.GetDecisionForRequest(It.IsAny<XacmlJsonRequestRoot>()), Times.Never);
    }

    private static Mock<IAppResources> CreateStatelessAppResources()
    {
        var appResources = new Mock<IAppResources>();
        appResources
            .Setup(x => x.GetUiConfiguration())
            .Returns(
                new UiConfiguration
                {
                    Folders = new Dictionary<string, LayoutSettings>
                    {
                        ["stateless"] = new() { DefaultDataType = "model" },
                    },
                }
            );
        appResources.Setup(x => x.GetLayoutsInFolder("stateless")).Returns("{}");
        appResources.Setup(x => x.GetModelJsonSchema("model")).Returns("{}");
        appResources
            .Setup(x => x.GetLayoutSettingsForFolder("stateless"))
            .Returns(new LayoutSettings { DefaultDataType = "model" });
        appResources.Setup(x => x.GetValidationConfiguration("model")).Returns((string?)null);

        return appResources;
    }

    private static ApplicationMetadata CreateStatelessAppMetadata(bool allowAnonymousOnStateless)
    {
        return new ApplicationMetadata("org/app")
        {
            DataTypes =
            [
                new DataType
                {
                    Id = "model",
                    AppLogic = new()
                    {
                        ClassRef = typeof(DummyModel).FullName,
                        AllowAnonymousOnStateless = allowAnonymousOnStateless,
                    },
                },
            ],
        };
    }

    private static FormBootstrapController CreateController(
        IInstanceClient instanceClient,
        IAppResources appResources,
        IAuthenticationContext? authenticationContext = null,
        IPDP? pdp = null,
        ClaimsPrincipal? user = null,
        ApplicationMetadata? appMetadata = null
    )
    {
        var appMetadataMock = new Mock<IAppMetadata>();
        appMetadataMock
            .Setup(x => x.GetApplicationMetadata())
            .ReturnsAsync(
                appMetadata
                    ?? new ApplicationMetadata("org/app")
                    {
                        DataTypes =
                        [
                            new DataType
                            {
                                Id = "model",
                                AppLogic = new()
                                {
                                    ClassRef = typeof(DummyModel).FullName,
                                    AllowAnonymousOnStateless = true,
                                },
                            },
                        ],
                    }
            );

        var implementationServices = new ServiceCollection();
        implementationServices.AddSingleton<IHttpContextAccessor, HttpContextAccessor>();
        implementationServices.AddAppImplementationFactory();
        implementationServices.AddSingleton(Mock.Of<IValidationService>());
        implementationServices.AddSingleton(Mock.Of<IFormDataReader>());
        implementationServices.AddSingleton(Mock.Of<IAppOptionsFileHandler>());
        var implementationServiceProvider = implementationServices.BuildServiceProvider();
        var appImplementationFactory = implementationServiceProvider.GetRequiredService<AppImplementationFactory>();

        var formBootstrapService = new FormBootstrapService(
            appResources,
            appMetadataMock.Object,
            Mock.Of<IAppOptionsService>(),
            new AppModelMock<DummyModel>(),
            Mock.Of<IPrefill>(),
            authenticationContext ?? Mock.Of<IAuthenticationContext>(),
            implementationServiceProvider,
            Mock.Of<ILogger<FormBootstrapService>>()
        );

        var controllerServices = new ServiceCollection();
        controllerServices.AddSingleton(formBootstrapService);
        controllerServices.AddSingleton(appImplementationFactory);

        var controller = new FormBootstrapController(
            controllerServices.BuildServiceProvider(),
            instanceClient,
            appResources,
            appMetadataMock.Object,
            pdp ?? Mock.Of<IPDP>(),
            authenticationContext ?? Mock.Of<IAuthenticationContext>(),
            Mock.Of<ILogger<FormBootstrapController>>()
        );
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user ?? new ClaimsPrincipal(new ClaimsIdentity()) },
        };

        return controller;
    }
}
