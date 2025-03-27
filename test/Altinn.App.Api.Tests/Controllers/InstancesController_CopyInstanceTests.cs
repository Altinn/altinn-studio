using Altinn.App.Api.Controllers;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Process;
using Altinn.App.Core.Models.Validation;
using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Common.PEP.Interfaces;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using IProcessEngine = Altinn.App.Core.Internal.Process.IProcessEngine;

namespace Altinn.App.Api.Tests.Controllers;

public class InstancesController_CopyInstanceTests
{
    [Fact]
    public async Task CopyInstance_CopyInstanceNotDefined_ReturnsBadRequest()
    {
        // Arrange
        using var fixture = InstancesControllerFixture.Create();
        ApplicationMetadata application = new("ttd/copy-instance") { };
        fixture.Mock<IAppMetadata>().Setup(a => a.GetApplicationMetadata()).ReturnsAsync(application);

        // Act
        var controller = fixture.ServiceProvider.GetRequiredService<InstancesController>();
        ActionResult actual = await controller.CopyInstance("ttd", "copy-instance", 343234, Guid.NewGuid());

        // Assert
        Assert.IsType<BadRequestObjectResult>(actual);
        BadRequestObjectResult badRequest = (BadRequestObjectResult)actual;
        Assert.Contains("copy from an archived instance is not enabled for this app", badRequest!.Value!.ToString());

        fixture.Mock<IAppMetadata>().VerifyAll();
        fixture.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task CopyInstance_CopyInstanceNotEnabled_ReturnsBadRequest()
    {
        // Arrange
        using var fixture = InstancesControllerFixture.Create();
        const string Org = "ttd";
        const string AppName = "copy-instance";
        fixture
            .Mock<IAppMetadata>()
            .Setup(a => a.GetApplicationMetadata())
            .ReturnsAsync(CreateApplicationMetadata(Org, AppName, false));

        // Act
        var controller = fixture.ServiceProvider.GetRequiredService<InstancesController>();
        ActionResult actual = await controller.CopyInstance("ttd", "copy-instance", 343234, Guid.NewGuid());

        // Assert
        Assert.IsType<BadRequestObjectResult>(actual);
        BadRequestObjectResult badRequest = (BadRequestObjectResult)actual;
        Assert.Contains("copy from an archived instance is not enabled for this app", badRequest!.Value!.ToString());

        fixture.Mock<IAppMetadata>().VerifyAll();
        fixture.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task CopyInstance_AsAppOwner_ReturnsForbidResult()
    {
        // Arrange
        using var fixture = InstancesControllerFixture.Create();
        fixture
            .Mock<HttpContext>()
            .Setup(httpContext => httpContext.User)
            .Returns(TestAuthentication.GetServiceOwnerPrincipal(org: "ttd"));

        // Act
        var controller = fixture.ServiceProvider.GetRequiredService<InstancesController>();
        ActionResult actual = await controller.CopyInstance("ttd", "copy-instance", 343234, Guid.NewGuid());

        // Assert
        Assert.IsType<ForbidResult>(actual);

        fixture.Mock<IAppMetadata>().VerifyAll();
        fixture.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task CopyInstance_AsUnauthorized_ReturnsForbidden()
    {
        // Arrange
        using var fixture = InstancesControllerFixture.Create();
        const string Org = "ttd";
        const string AppName = "copy-instance";
        fixture
            .Mock<HttpContext>()
            .Setup(httpContext => httpContext.User)
            .Returns(TestAuthentication.GetUserPrincipal(1337));
        fixture
            .Mock<IAppMetadata>()
            .Setup(a => a.GetApplicationMetadata())
            .ReturnsAsync(CreateApplicationMetadata(Org, AppName, true));
        fixture
            .Mock<IPDP>()
            .Setup<Task<XacmlJsonResponse>>(p => p.GetDecisionForRequest(It.IsAny<XacmlJsonRequestRoot>()))
            .ReturnsAsync(CreateXacmlResponse("Deny"));

        // Act
        var controller = fixture.ServiceProvider.GetRequiredService<InstancesController>();
        ActionResult actual = await controller.CopyInstance("ttd", "copy-instance", 343234, Guid.NewGuid());

        // Assert
        Assert.IsType<StatusCodeResult>(actual);
        StatusCodeResult statusCodeResult = (StatusCodeResult)actual;
        Assert.Equal(403, statusCodeResult.StatusCode);

        fixture.Mock<IAppMetadata>().VerifyAll();
        fixture.Mock<IPDP>().VerifyAll();
        fixture.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task CopyInstance_InstanceNotArchived_ReturnsBadRequest()
    {
        // Arrange
        using var fixture = InstancesControllerFixture.Create();
        const string Org = "ttd";
        const string AppName = "copy-instance";
        int instanceOwnerPartyId = 343234;
        Guid instanceGuid = Guid.NewGuid();
        Instance instance = new()
        {
            Id = $"{instanceOwnerPartyId}/{instanceGuid}",
            Status = new InstanceStatus() { IsArchived = false },
        };

        fixture
            .Mock<HttpContext>()
            .Setup(httpContext => httpContext.User)
            .Returns(TestAuthentication.GetUserPrincipal(1337, instanceOwnerPartyId));
        fixture
            .Mock<IAppMetadata>()
            .Setup(a => a.GetApplicationMetadata())
            .ReturnsAsync(CreateApplicationMetadata(Org, AppName, true));
        fixture
            .Mock<IPDP>()
            .Setup<Task<XacmlJsonResponse>>(p => p.GetDecisionForRequest(It.IsAny<XacmlJsonRequestRoot>()))
            .ReturnsAsync(CreateXacmlResponse("Permit"));
        fixture
            .Mock<IInstanceClient>()
            .Setup(i => i.GetInstance(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<Guid>()))
            .ReturnsAsync(instance);

        // Act
        var controller = fixture.ServiceProvider.GetRequiredService<InstancesController>();
        ActionResult actual = await controller.CopyInstance("ttd", "copy-instance", instanceOwnerPartyId, instanceGuid);

        // Assert
        Assert.IsType<BadRequestObjectResult>(actual);
        BadRequestObjectResult badRequest = (BadRequestObjectResult)actual;
        Assert.Contains("instance being copied must be archived", badRequest!.Value!.ToString());

        fixture.Mock<IAppMetadata>().VerifyAll();
        fixture.Mock<IPDP>().VerifyAll();
        fixture.Mock<IInstanceClient>().VerifyAll();
        fixture.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task CopyInstance_InstanceDoesNotExists_ReturnsBadRequest()
    {
        // Arrange
        using var fixture = InstancesControllerFixture.Create();
        const string Org = "ttd";
        const string AppName = "copy-instance";
        int instanceOwnerPartyId = 343234;
        Guid instanceGuid = Guid.NewGuid();

        // Storage returns Forbidden if the given instance id is wrong.
        PlatformHttpException platformHttpException = await PlatformHttpException.CreateAsync(
            new HttpResponseMessage(System.Net.HttpStatusCode.Forbidden)
        );

        fixture
            .Mock<HttpContext>()
            .Setup(httpContext => httpContext.User)
            .Returns(TestAuthentication.GetUserPrincipal(1337, instanceOwnerPartyId));
        fixture
            .Mock<IAppMetadata>()
            .Setup(a => a.GetApplicationMetadata())
            .ReturnsAsync(CreateApplicationMetadata(Org, AppName, true));
        fixture
            .Mock<IPDP>()
            .Setup<Task<XacmlJsonResponse>>(p => p.GetDecisionForRequest(It.IsAny<XacmlJsonRequestRoot>()))
            .ReturnsAsync(CreateXacmlResponse("Permit"));
        fixture
            .Mock<IInstanceClient>()
            .Setup(i => i.GetInstance(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<Guid>()))
            .ThrowsAsync(platformHttpException);

        // Act
        var controller = fixture.ServiceProvider.GetRequiredService<InstancesController>();
        ActionResult actual = await controller.CopyInstance("ttd", "copy-instance", instanceOwnerPartyId, instanceGuid);

        // Assert
        Assert.IsType<BadRequestObjectResult>(actual);
        BadRequestObjectResult badRequest = (BadRequestObjectResult)actual;
        Assert.Contains("instance being copied must be archived", badRequest!.Value!.ToString());

        fixture.Mock<IAppMetadata>().VerifyAll();
        fixture.Mock<IPDP>().VerifyAll();
        fixture.Mock<IInstanceClient>().VerifyAll();
        fixture.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task CopyInstance_PlatformReturnsError_ThrowsException()
    {
        // Arrange
        using var fixture = InstancesControllerFixture.Create();
        const string Org = "ttd";
        const string AppName = "copy-instance";
        int instanceOwnerPartyId = 343234;
        Guid instanceGuid = Guid.NewGuid();

        // Simulate a BadGateway respons from Platform
        PlatformHttpException platformHttpException = await PlatformHttpException.CreateAsync(
            new HttpResponseMessage(System.Net.HttpStatusCode.BadGateway)
        );

        fixture
            .Mock<HttpContext>()
            .Setup(httpContext => httpContext.User)
            .Returns(TestAuthentication.GetUserPrincipal(1337, instanceOwnerPartyId));
        fixture
            .Mock<IAppMetadata>()
            .Setup(a => a.GetApplicationMetadata())
            .ReturnsAsync(CreateApplicationMetadata(Org, AppName, true));
        fixture
            .Mock<IPDP>()
            .Setup<Task<XacmlJsonResponse>>(p => p.GetDecisionForRequest(It.IsAny<XacmlJsonRequestRoot>()))
            .ReturnsAsync(CreateXacmlResponse("Permit"));
        fixture
            .Mock<IInstanceClient>()
            .Setup(i => i.GetInstance(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<Guid>()))
            .ThrowsAsync(platformHttpException);

        PlatformHttpException? actual = null;

        // Act
        try
        {
            var controller = fixture.ServiceProvider.GetRequiredService<InstancesController>();
            await controller.CopyInstance("ttd", "copy-instance", instanceOwnerPartyId, instanceGuid);
        }
        catch (PlatformHttpException phe)
        {
            actual = phe;
        }

        // Assert
        Assert.NotNull(actual);

        fixture.Mock<IAppMetadata>().VerifyAll();
        fixture.Mock<IPDP>().VerifyAll();
        fixture.Mock<IInstanceClient>().VerifyAll();
        fixture.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task CopyInstance_InstantiationValidationFails_ReturnsForbidden()
    {
        // Arrange
        using var fixture = InstancesControllerFixture.Create();
        const string Org = "ttd";
        const string AppName = "copy-instance";
        int instanceOwnerPartyId = 343234;
        Guid instanceGuid = Guid.NewGuid();
        Instance instance = new()
        {
            Id = $"{instanceOwnerPartyId}/{instanceGuid}",
            Status = new InstanceStatus() { IsArchived = true },
        };
        InstantiationValidationResult? instantiationValidationResult = new() { Valid = false };

        fixture
            .Mock<HttpContext>()
            .Setup(httpContext => httpContext.User)
            .Returns(TestAuthentication.GetUserPrincipal(1337, instanceOwnerPartyId));
        fixture
            .Mock<IAppMetadata>()
            .Setup(a => a.GetApplicationMetadata())
            .ReturnsAsync(CreateApplicationMetadata(Org, AppName, true));
        fixture
            .Mock<IPDP>()
            .Setup<Task<XacmlJsonResponse>>(p => p.GetDecisionForRequest(It.IsAny<XacmlJsonRequestRoot>()))
            .ReturnsAsync(CreateXacmlResponse("Permit"));
        fixture
            .Mock<IInstanceClient>()
            .Setup(i => i.GetInstance(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<Guid>()))
            .ReturnsAsync(instance);
        fixture
            .Mock<IInstantiationValidator>()
            .Setup(v => v.Validate(It.IsAny<Instance>()))
            .ReturnsAsync(instantiationValidationResult);

        // Act
        var controller = fixture.ServiceProvider.GetRequiredService<InstancesController>();
        ActionResult actual = await controller.CopyInstance("ttd", "copy-instance", instanceOwnerPartyId, instanceGuid);

        // Assert
        Assert.IsType<ObjectResult>(actual);
        ObjectResult objectResult = (ObjectResult)actual;
        Assert.Equal(403, objectResult.StatusCode);

        fixture.Mock<IAppMetadata>().VerifyAll();
        fixture.Mock<IPDP>().VerifyAll();
        fixture.Mock<IInstanceClient>().VerifyAll();
        fixture.Mock<IInstantiationValidator>().VerifyAll();

        fixture.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task CopyInstance_EverythingIsFine_ReturnsRedirect()
    {
        // Arrange
        using var fixture = InstancesControllerFixture.Create();
        const string Org = "ttd";
        const string AppName = "copy-instance";
        const int InstanceOwnerPartyId = 343234;
        Guid instanceGuid = Guid.NewGuid();
        Guid dataGuid = Guid.NewGuid();
        const string dataTypeId = "data_type_1";
        Instance instance = new()
        {
            Id = $"{InstanceOwnerPartyId}/{instanceGuid}",
            AppId = $"{Org}/{AppName}",
            InstanceOwner = new InstanceOwner() { PartyId = InstanceOwnerPartyId.ToString() },
            Status = new InstanceStatus() { IsArchived = true },
            Process = new ProcessState() { CurrentTask = new ProcessElementInfo() { ElementId = "First" } },
            Data = new List<DataElement>
            {
                new DataElement { Id = dataGuid.ToString(), DataType = dataTypeId },
            },
        };
        InstantiationValidationResult? instantiationValidationResult = new() { Valid = true };

        fixture
            .Mock<HttpContext>()
            .Setup(hc => hc.User)
            .Returns(TestAuthentication.GetUserPrincipal(1337, InstanceOwnerPartyId));
        fixture.Mock<HttpContext>().Setup(hc => hc.Request).Returns(Mock.Of<HttpRequest>());
        fixture
            .Mock<IAppMetadata>()
            .Setup(a => a.GetApplicationMetadata())
            .ReturnsAsync(CreateApplicationMetadata(Org, AppName, true));
        fixture
            .Mock<IPDP>()
            .Setup<Task<XacmlJsonResponse>>(p => p.GetDecisionForRequest(It.IsAny<XacmlJsonRequestRoot>()))
            .ReturnsAsync(CreateXacmlResponse("Permit"));
        fixture
            .Mock<IInstanceClient>()
            .Setup(i => i.GetInstance(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<Guid>()))
            .ReturnsAsync(instance);
        fixture
            .Mock<IInstanceClient>()
            .Setup(i => i.CreateInstance(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Instance>()))
            .ReturnsAsync(instance);
        fixture.Mock<IInstanceClient>().Setup(i => i.GetInstance(It.IsAny<Instance>())).ReturnsAsync(instance);
        fixture
            .Mock<IInstantiationValidator>()
            .Setup(v => v.Validate(It.IsAny<Instance>()))
            .ReturnsAsync(instantiationValidationResult);
        fixture
            .Mock<IProcessEngine>()
            .Setup(p => p.GenerateProcessStartEvents(It.IsAny<ProcessStartRequest>()))
            .ReturnsAsync(() =>
            {
                return new ProcessChangeResult() { Success = true };
            });
        fixture
            .Mock<IProcessEngine>()
            .Setup(p =>
                p.HandleEventsAndUpdateStorage(
                    It.IsAny<Instance>(),
                    It.IsAny<Dictionary<string, string>>(),
                    It.IsAny<List<InstanceEvent>>()
                )
            );
        fixture
            .Mock<IDataClient>()
            .Setup(p => p.GetFormData(instanceGuid, It.IsAny<Type?>()!, Org, AppName, InstanceOwnerPartyId, dataGuid))
            .ReturnsAsync(new { test = "test" });
        fixture
            .Mock<IDataClient>()
            .Setup(p =>
                p.InsertFormData(
                    It.IsAny<object>(),
                    instanceGuid,
                    It.IsAny<Type?>()!,
                    Org,
                    AppName,
                    InstanceOwnerPartyId,
                    dataTypeId
                )
            )
            .ReturnsAsync(new DataElement());

        // Act
        var controller = fixture.ServiceProvider.GetRequiredService<InstancesController>();
        ActionResult actual = await controller.CopyInstance(Org, AppName, InstanceOwnerPartyId, instanceGuid);

        // Assert
        Assert.IsType<RedirectResult>(actual);
        RedirectResult objectResult = (RedirectResult)actual;
        Assert.Contains($"/#/instance/{InstanceOwnerPartyId}/", objectResult.Url);

        fixture.Mock<IAppMetadata>().VerifyAll();
        fixture.Mock<IPDP>().VerifyAll();
        fixture.Mock<IInstanceClient>().VerifyAll();
        fixture.Mock<IProcessEngine>().VerifyAll();
        fixture.Mock<IInstantiationValidator>().VerifyAll();

        fixture.VerifyNoOtherCalls(
            verifyDataClient: false,
            verifyAppModel: false,
            verifyInstantiationProcessor: false,
            verifyPrefill: false
        );
    }

    private static ApplicationMetadata CreateApplicationMetadata(string org, string app, bool enableCopyInstance)
    {
        return new($"{org}/{app}")
        {
            CopyInstanceSettings = new CopyInstanceSettings { Enabled = enableCopyInstance },
            DataTypes = new List<DataType>
            {
                new DataType
                {
                    Id = "data_type_1",
                    AppLogic = new ApplicationLogic { ClassRef = "App.Models.Skjema" },
                    TaskId = "First",
                },
            },
            Org = org,
        };
    }

    private static XacmlJsonResponse CreateXacmlResponse(string decision)
    {
        return new XacmlJsonResponse() { Response = new() { new XacmlJsonResult() { Decision = decision } } };
    }
}
