using Altinn.App.Api.Controllers;
using Altinn.App.Api.Helpers.Patch;
using Altinn.App.Api.Tests.Utils;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Events;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Prefill;
using Altinn.App.Core.Internal.Profile;
using Altinn.App.Core.Internal.Registers;
using Altinn.App.Core.Internal.Validation;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Process;
using Altinn.App.Core.Models.Validation;
using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Common.PEP.Interfaces;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using IProcessEngine = Altinn.App.Core.Internal.Process.IProcessEngine;

namespace Altinn.App.Api.Tests.Controllers;

public class InstancesController_CopyInstanceTests
{
    private readonly Mock<ILogger<InstancesController>> _logger = new();
    private readonly Mock<IAltinnPartyClient> _registrer = new();
    private readonly Mock<IInstanceClient> _instanceClient = new();
    private readonly Mock<IDataClient> _data = new(MockBehavior.Strict);
    private readonly Mock<IAppMetadata> _appMetadata = new();
    private readonly Mock<IAppModel> _appModel = new();
    private readonly Mock<IInstantiationProcessor> _instantiationProcessor = new();
    private readonly Mock<IInstantiationValidator> _instantiationValidator = new();
    private readonly Mock<IPDP> _pdp = new();
    private readonly Mock<IEventsClient> _eventsService = new();
    private readonly IOptions<AppSettings> _appSettings = Options.Create<AppSettings>(new());
    private readonly Mock<IPrefill> _prefill = new();
    private readonly Mock<IProfileClient> _profile = new();
    private readonly Mock<IProcessEngine> _processEngine = new();
    private readonly Mock<HttpContext> _httpContextMock = new();
    private readonly Mock<IOrganizationClient> _oarganizationClientMock = new();
    private readonly Mock<IHostEnvironment> _envMock = new();
    private readonly Mock<IValidationService> _validationService = new(MockBehavior.Strict);

    private readonly InstancesController SUT;

    public InstancesController_CopyInstanceTests()
    {
        ControllerContext controllerContext = new ControllerContext() { HttpContext = _httpContextMock.Object };

        var modelSerializationService = new ModelSerializationService(_appModel.Object);
        var patchService = new InternalPatchService(
            _appMetadata.Object,
            _data.Object,
            _instanceClient.Object,
            _validationService.Object,
            [],
            [],
            modelSerializationService,
            _envMock.Object
        );
        SUT = new InstancesController(
            _logger.Object,
            _registrer.Object,
            _instanceClient.Object,
            _data.Object,
            _appMetadata.Object,
            _appModel.Object,
            _instantiationProcessor.Object,
            _instantiationValidator.Object,
            _pdp.Object,
            _eventsService.Object,
            _appSettings,
            _prefill.Object,
            _profile.Object,
            _processEngine.Object,
            _oarganizationClientMock.Object,
            _envMock.Object,
            modelSerializationService,
            patchService
        )
        {
            ControllerContext = controllerContext,
        };
    }

    private void VerifyNoOtherCalls()
    {
        _registrer.VerifyNoOtherCalls();
        _instanceClient.VerifyNoOtherCalls();
        _appMetadata.VerifyNoOtherCalls();
        _instantiationValidator.VerifyNoOtherCalls();
        _pdp.VerifyNoOtherCalls();
        _eventsService.VerifyNoOtherCalls();
        _profile.VerifyNoOtherCalls();
        _processEngine.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task CopyInstance_CopyInstanceNotDefined_ReturnsBadRequest()
    {
        // Arrange
        ApplicationMetadata application = new("ttd/copy-instance") { };
        _appMetadata.Setup(a => a.GetApplicationMetadata()).ReturnsAsync(application);

        // Act
        ActionResult actual = await SUT.CopyInstance("ttd", "copy-instance", 343234, Guid.NewGuid());

        // Assert
        Assert.IsType<BadRequestObjectResult>(actual);
        BadRequestObjectResult badRequest = (BadRequestObjectResult)actual;
        Assert.Contains("copy from an archived instance is not enabled for this app", badRequest!.Value!.ToString());

        _appMetadata.VerifyAll();
        VerifyNoOtherCalls();
    }

    [Fact]
    public async Task CopyInstance_CopyInstanceNotEnabled_ReturnsBadRequest()
    {
        // Arrange
        const string Org = "ttd";
        const string AppName = "copy-instance";
        _appMetadata
            .Setup(a => a.GetApplicationMetadata())
            .ReturnsAsync(CreateApplicationMetadata(Org, AppName, false));

        // Act
        ActionResult actual = await SUT.CopyInstance("ttd", "copy-instance", 343234, Guid.NewGuid());

        // Assert
        Assert.IsType<BadRequestObjectResult>(actual);
        BadRequestObjectResult badRequest = (BadRequestObjectResult)actual;
        Assert.Contains("copy from an archived instance is not enabled for this app", badRequest!.Value!.ToString());

        _appMetadata.VerifyAll();
        VerifyNoOtherCalls();
    }

    [Fact]
    public async Task CopyInstance_AsAppOwner_ReturnsForbidResult()
    {
        // Arrange
        _httpContextMock.Setup(httpContext => httpContext.User).Returns(PrincipalUtil.GetOrgPrincipal("ttd"));

        // Act
        ActionResult actual = await SUT.CopyInstance("ttd", "copy-instance", 343234, Guid.NewGuid());

        // Assert
        Assert.IsType<ForbidResult>(actual);

        _appMetadata.VerifyAll();
        VerifyNoOtherCalls();
    }

    [Fact]
    public async Task CopyInstance_AsUnauthorized_ReturnsForbidden()
    {
        // Arrange
        const string Org = "ttd";
        const string AppName = "copy-instance";
        _httpContextMock.Setup(httpContext => httpContext.User).Returns(PrincipalUtil.GetUserPrincipal(1337, null));
        _appMetadata.Setup(a => a.GetApplicationMetadata()).ReturnsAsync(CreateApplicationMetadata(Org, AppName, true));
        _pdp.Setup<Task<XacmlJsonResponse>>(p => p.GetDecisionForRequest(It.IsAny<XacmlJsonRequestRoot>()))
            .ReturnsAsync(CreateXacmlResponse("Deny"));

        // Act
        ActionResult actual = await SUT.CopyInstance("ttd", "copy-instance", 343234, Guid.NewGuid());

        // Assert
        Assert.IsType<StatusCodeResult>(actual);
        StatusCodeResult statusCodeResult = (StatusCodeResult)actual;
        Assert.Equal(403, statusCodeResult.StatusCode);

        _appMetadata.VerifyAll();
        _pdp.VerifyAll();
        VerifyNoOtherCalls();
    }

    [Fact]
    public async Task CopyInstance_InstanceNotArchived_ReturnsBadRequest()
    {
        // Arrange
        const string Org = "ttd";
        const string AppName = "copy-instance";
        int instanceOwnerPartyId = 343234;
        Guid instanceGuid = Guid.NewGuid();
        Instance instance = new()
        {
            Id = $"{instanceOwnerPartyId}/{instanceGuid}",
            Status = new InstanceStatus() { IsArchived = false },
        };

        _httpContextMock.Setup(httpContext => httpContext.User).Returns(PrincipalUtil.GetUserPrincipal(1337, null));
        _appMetadata.Setup(a => a.GetApplicationMetadata()).ReturnsAsync(CreateApplicationMetadata(Org, AppName, true));
        _pdp.Setup<Task<XacmlJsonResponse>>(p => p.GetDecisionForRequest(It.IsAny<XacmlJsonRequestRoot>()))
            .ReturnsAsync(CreateXacmlResponse("Permit"));
        _instanceClient
            .Setup(i => i.GetInstance(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<Guid>()))
            .ReturnsAsync(instance);

        // Act
        ActionResult actual = await SUT.CopyInstance("ttd", "copy-instance", instanceOwnerPartyId, instanceGuid);

        // Assert
        Assert.IsType<BadRequestObjectResult>(actual);
        BadRequestObjectResult badRequest = (BadRequestObjectResult)actual;
        Assert.Contains("instance being copied must be archived", badRequest!.Value!.ToString());

        _appMetadata.VerifyAll();
        _pdp.VerifyAll();
        _instanceClient.VerifyAll();
        VerifyNoOtherCalls();
    }

    [Fact]
    public async Task CopyInstance_InstanceDoesNotExists_ReturnsBadRequest()
    {
        // Arrange
        const string Org = "ttd";
        const string AppName = "copy-instance";
        int instanceOwnerPartyId = 343234;
        Guid instanceGuid = Guid.NewGuid();

        // Storage returns Forbidden if the given instance id is wrong.
        PlatformHttpException platformHttpException = await PlatformHttpException.CreateAsync(
            new HttpResponseMessage(System.Net.HttpStatusCode.Forbidden)
        );

        _httpContextMock.Setup(httpContext => httpContext.User).Returns(PrincipalUtil.GetUserPrincipal(1337, null));
        _appMetadata.Setup(a => a.GetApplicationMetadata()).ReturnsAsync(CreateApplicationMetadata(Org, AppName, true));
        _pdp.Setup<Task<XacmlJsonResponse>>(p => p.GetDecisionForRequest(It.IsAny<XacmlJsonRequestRoot>()))
            .ReturnsAsync(CreateXacmlResponse("Permit"));
        _instanceClient
            .Setup(i => i.GetInstance(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<Guid>()))
            .ThrowsAsync(platformHttpException);

        // Act
        ActionResult actual = await SUT.CopyInstance("ttd", "copy-instance", instanceOwnerPartyId, instanceGuid);

        // Assert
        Assert.IsType<BadRequestObjectResult>(actual);
        BadRequestObjectResult badRequest = (BadRequestObjectResult)actual;
        Assert.Contains("instance being copied must be archived", badRequest!.Value!.ToString());

        _appMetadata.VerifyAll();
        _pdp.VerifyAll();
        _instanceClient.VerifyAll();
        VerifyNoOtherCalls();
    }

    [Fact]
    public async Task CopyInstance_PlatformReturnsError_ThrowsException()
    {
        // Arrange
        const string Org = "ttd";
        const string AppName = "copy-instance";
        int instanceOwnerPartyId = 343234;
        Guid instanceGuid = Guid.NewGuid();

        // Simulate a BadGateway respons from Platform
        PlatformHttpException platformHttpException = await PlatformHttpException.CreateAsync(
            new HttpResponseMessage(System.Net.HttpStatusCode.BadGateway)
        );

        _httpContextMock.Setup(httpContext => httpContext.User).Returns(PrincipalUtil.GetUserPrincipal(1337, null));
        _appMetadata.Setup(a => a.GetApplicationMetadata()).ReturnsAsync(CreateApplicationMetadata(Org, AppName, true));
        _pdp.Setup<Task<XacmlJsonResponse>>(p => p.GetDecisionForRequest(It.IsAny<XacmlJsonRequestRoot>()))
            .ReturnsAsync(CreateXacmlResponse("Permit"));
        _instanceClient
            .Setup(i => i.GetInstance(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<Guid>()))
            .ThrowsAsync(platformHttpException);

        PlatformHttpException? actual = null;

        // Act
        try
        {
            await SUT.CopyInstance("ttd", "copy-instance", instanceOwnerPartyId, instanceGuid);
        }
        catch (PlatformHttpException phe)
        {
            actual = phe;
        }

        // Assert
        Assert.NotNull(actual);

        _appMetadata.VerifyAll();
        _pdp.VerifyAll();
        _instanceClient.VerifyAll();
        VerifyNoOtherCalls();
    }

    [Fact]
    public async Task CopyInstance_InstantiationValidationFails_ReturnsForbidden()
    {
        // Arrange
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

        _httpContextMock.Setup(httpContext => httpContext.User).Returns(PrincipalUtil.GetUserPrincipal(1337, null));
        _appMetadata.Setup(a => a.GetApplicationMetadata()).ReturnsAsync(CreateApplicationMetadata(Org, AppName, true));
        _pdp.Setup<Task<XacmlJsonResponse>>(p => p.GetDecisionForRequest(It.IsAny<XacmlJsonRequestRoot>()))
            .ReturnsAsync(CreateXacmlResponse("Permit"));
        _instanceClient
            .Setup(i => i.GetInstance(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<Guid>()))
            .ReturnsAsync(instance);
        _instantiationValidator
            .Setup(v => v.Validate(It.IsAny<Instance>()))
            .ReturnsAsync(instantiationValidationResult);

        // Act
        ActionResult actual = await SUT.CopyInstance("ttd", "copy-instance", instanceOwnerPartyId, instanceGuid);

        // Assert
        Assert.IsType<ObjectResult>(actual);
        ObjectResult objectResult = (ObjectResult)actual;
        Assert.Equal(403, objectResult.StatusCode);

        _appMetadata.VerifyAll();
        _pdp.VerifyAll();
        _instanceClient.VerifyAll();
        _instantiationValidator.VerifyAll();

        VerifyNoOtherCalls();
    }

    [Fact]
    public async Task CopyInstance_EverythingIsFine_ReturnsRedirect()
    {
        // Arrange
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

        _httpContextMock.Setup(hc => hc.User).Returns(PrincipalUtil.GetUserPrincipal(1337, null));
        _httpContextMock.Setup(hc => hc.Request).Returns(Mock.Of<HttpRequest>());
        _appMetadata.Setup(a => a.GetApplicationMetadata()).ReturnsAsync(CreateApplicationMetadata(Org, AppName, true));
        _pdp.Setup<Task<XacmlJsonResponse>>(p => p.GetDecisionForRequest(It.IsAny<XacmlJsonRequestRoot>()))
            .ReturnsAsync(CreateXacmlResponse("Permit"));
        _instanceClient
            .Setup(i => i.GetInstance(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<Guid>()))
            .ReturnsAsync(instance);
        _instanceClient
            .Setup(i => i.CreateInstance(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Instance>()))
            .ReturnsAsync(instance);
        _instanceClient.Setup(i => i.GetInstance(It.IsAny<Instance>())).ReturnsAsync(instance);
        _instantiationValidator
            .Setup(v => v.Validate(It.IsAny<Instance>()))
            .ReturnsAsync(instantiationValidationResult);
        _processEngine
            .Setup(p => p.GenerateProcessStartEvents(It.IsAny<ProcessStartRequest>()))
            .ReturnsAsync(() =>
            {
                return new ProcessChangeResult() { Success = true };
            });
        _processEngine.Setup(p =>
            p.HandleEventsAndUpdateStorage(
                It.IsAny<Instance>(),
                It.IsAny<Dictionary<string, string>>(),
                It.IsAny<List<InstanceEvent>>()
            )
        );
        _data
            .Setup(p => p.GetFormData(instanceGuid, It.IsAny<Type?>()!, Org, AppName, InstanceOwnerPartyId, dataGuid))
            .ReturnsAsync(new { test = "test" });
        _data
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
        ActionResult actual = await SUT.CopyInstance(Org, AppName, InstanceOwnerPartyId, instanceGuid);

        // Assert
        Assert.IsType<RedirectResult>(actual);
        RedirectResult objectResult = (RedirectResult)actual;
        Assert.Contains($"/#/instance/{InstanceOwnerPartyId}/", objectResult.Url);

        _appMetadata.VerifyAll();
        _pdp.VerifyAll();
        _instanceClient.VerifyAll();
        _processEngine.VerifyAll();
        _instantiationValidator.VerifyAll();

        VerifyNoOtherCalls();
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
