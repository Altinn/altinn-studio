using System.Security.Claims;
using Altinn.App.Api.Controllers;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Features.Bootstrap;
using Altinn.App.Core.Features.Options;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Prefill;
using Altinn.App.Core.Models;
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
        Assert.Equal("The 'prefill' query parameter must be a valid JSON object.", problemDetails.Detail);
    }

    private static FormBootstrapController CreateController(IInstanceClient instanceClient, IAppResources appResources)
    {
        var implementationServices = new ServiceCollection();
        implementationServices.AddSingleton<IHttpContextAccessor, HttpContextAccessor>();
        implementationServices.AddAppImplementationFactory();
        implementationServices.AddSingleton(Mock.Of<IInitialValidationService>());
        implementationServices.AddSingleton(Mock.Of<IFormDataReader>());
        var implementationServiceProvider = implementationServices.BuildServiceProvider();
        var appImplementationFactory = implementationServiceProvider.GetRequiredService<AppImplementationFactory>();

        var formBootstrapService = new FormBootstrapService(
            appResources,
            Mock.Of<IAppMetadata>(),
            Mock.Of<IAppOptionsService>(),
            Mock.Of<IAppModel>(),
            Mock.Of<IPrefill>(),
            Mock.Of<IAuthenticationContext>(),
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
            Mock.Of<IAppMetadata>(),
            Mock.Of<ILogger<FormBootstrapController>>()
        );
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(
                    new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, "test-user")], "TestAuth")
                ),
            },
        };

        return controller;
    }
}
