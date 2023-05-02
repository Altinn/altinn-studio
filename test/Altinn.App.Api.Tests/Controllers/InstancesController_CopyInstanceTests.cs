using Altinn.App.Api.Controllers;
using Altinn.App.Api.Tests.Utils;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Interface;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Validation;

using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Common.PEP.Interfaces;
using Altinn.Platform.Storage.Interface.Models;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

using Moq;
using Xunit;

namespace Altinn.App.Api.Tests.Controllers;

public class InstancesController_CopyInstanceTests
{
    private readonly Mock<ILogger<InstancesController>> _logger = new();
    private readonly Mock<IRegister> _registrer = new();
    private readonly Mock<IInstance> _instanceClient = new();
    private readonly Mock<IData> _data = new();
    private readonly Mock<IAppMetadata> _appMetadata = new();
    private readonly Mock<IAppModel> _appModel = new();
    private readonly Mock<IInstantiationProcessor> _instantiationProcessor = new();
    private readonly Mock<IInstantiationValidator> _instantiationValidator = new();
    private readonly Mock<IPDP> _pdp = new();
    private readonly Mock<IEvents> _eventsService = new();
    private readonly IOptions<AppSettings> _appSettings = Options.Create<AppSettings>(new());
    private readonly Mock<IPrefill> _prefill = new();
    private readonly Mock<IProfile> _profile = new();
    private readonly Mock<IProcessEngine> _processEngine = new();
    private readonly Mock<HttpContext> _httpContextMock = new();

    private readonly InstancesController SUT;

    public InstancesController_CopyInstanceTests()
    {
        ControllerContext controllerContext = new ControllerContext()
        {
            HttpContext = _httpContextMock.Object
        }; 
        
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
            _processEngine.Object)
        { 
            ControllerContext = controllerContext
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
        _appMetadata.Setup(a => a.GetApplicationMetadata())
            .ReturnsAsync(CreateApplicationMetadata($"{Org}/{AppName}", false));

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
        _httpContextMock.Setup(httpContext => httpContext.User).Returns(PrincipalUtil.GetUserPrincipal(1337));
        _appMetadata.Setup(a => a.GetApplicationMetadata())
            .ReturnsAsync(CreateApplicationMetadata($"{Org}/{AppName}", true));
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
            Status = new InstanceStatus() { IsArchived = false }
        };

        _httpContextMock.Setup(httpContext => httpContext.User).Returns(PrincipalUtil.GetUserPrincipal(1337));
        _appMetadata.Setup(a => a.GetApplicationMetadata())
            .ReturnsAsync(CreateApplicationMetadata($"{Org}/{AppName}", true));
        _pdp.Setup<Task<XacmlJsonResponse>>(p => p.GetDecisionForRequest(It.IsAny<XacmlJsonRequestRoot>()))
            .ReturnsAsync(CreateXacmlResponse("Permit"));
        _instanceClient.Setup(i => i.GetInstance(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<Guid>()))
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
            Status = new InstanceStatus() { IsArchived = true }
        };
        InstantiationValidationResult? instantiationValidationResult = new() { Valid = false };

        _httpContextMock.Setup(httpContext => httpContext.User).Returns(PrincipalUtil.GetUserPrincipal(1337));
        _appMetadata.Setup(a => a.GetApplicationMetadata())
            .ReturnsAsync(CreateApplicationMetadata($"{Org}/{AppName}", true));
        _pdp.Setup<Task<XacmlJsonResponse>>(p => p.GetDecisionForRequest(It.IsAny<XacmlJsonRequestRoot>()))
            .ReturnsAsync(CreateXacmlResponse("Permit"));
        _instanceClient.Setup(i => i.GetInstance(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<Guid>()))
            .ReturnsAsync(instance);
        _instantiationValidator.Setup(v => v.Validate(It.IsAny<Instance>())).ReturnsAsync(instantiationValidationResult);

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
        Instance instance = new()
        {
            Id = $"{InstanceOwnerPartyId}/{instanceGuid}",
            AppId = $"{Org}/{AppName}",
            InstanceOwner = new InstanceOwner() { PartyId = InstanceOwnerPartyId.ToString() },
            Status = new InstanceStatus() { IsArchived = true },
            Process = new ProcessState() { CurrentTask = new ProcessElementInfo() { ElementId = "First" } },
            Data = new List<DataElement>
            {
                new DataElement { Id = Guid.NewGuid().ToString(), DataType = "data_type_1" }
            }
        };
        InstantiationValidationResult? instantiationValidationResult = new() { Valid = true };

        _httpContextMock.Setup(hc => hc.User).Returns(PrincipalUtil.GetUserPrincipal(1337));
        _httpContextMock.Setup(hc => hc.Request).Returns(Mock.Of<HttpRequest>());
        _appMetadata.Setup(a => a.GetApplicationMetadata())
            .ReturnsAsync(CreateApplicationMetadata($"{Org}/{AppName}", true));
        _pdp.Setup<Task<XacmlJsonResponse>>(p => p.GetDecisionForRequest(It.IsAny<XacmlJsonRequestRoot>()))
            .ReturnsAsync(CreateXacmlResponse("Permit"));
        _instanceClient.Setup(i => i.GetInstance(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<Guid>()))
            .ReturnsAsync(instance);
        _instanceClient.Setup(i => i.CreateInstance(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Instance>())).ReturnsAsync(instance);
        _instanceClient.Setup(i => i.GetInstance(It.IsAny<Instance>())).ReturnsAsync(instance);
        _instantiationValidator.Setup(v => v.Validate(It.IsAny<Instance>())).ReturnsAsync(instantiationValidationResult);
        _processEngine.Setup(p => p.StartProcess(It.IsAny<ProcessChangeContext>()))
            .ReturnsAsync((ProcessChangeContext pcc) => { return pcc; });
        _processEngine.Setup(p => p.StartTask(It.IsAny<ProcessChangeContext>()));

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

    private static ApplicationMetadata CreateApplicationMetadata(string appId, bool enableCopyInstance)
    {
        return new(appId)
        {
            CopyInstanceSettings = new CopyInstanceSettings { Enabled = enableCopyInstance },
            DataTypes = new List<DataType> 
            { 
                new DataType 
                { 
                    Id = "data_type_1",
                    AppLogic = new ApplicationLogic
                    {
                        ClassRef = "App.Models.Skjema",
                    },
                    TaskId = "First"
                } 
            }
        };
    }

    private static XacmlJsonResponse CreateXacmlResponse(string decision)
    {
        return new XacmlJsonResponse() { Response = new() { new XacmlJsonResult() { Decision = decision } } };
    }
}
