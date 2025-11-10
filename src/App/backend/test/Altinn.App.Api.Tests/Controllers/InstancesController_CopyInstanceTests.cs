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
        var auth = TestAuthentication.GetUserAuthentication(userPartyId: 343234);
        using var fixture = InstancesControllerFixture.Create(auth);
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
        var auth = TestAuthentication.GetUserAuthentication(userPartyId: 343234);
        using var fixture = InstancesControllerFixture.Create(auth);
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
        var auth = TestAuthentication.GetServiceOwnerAuthentication(org: "ttd");
        using var fixture = InstancesControllerFixture.Create(auth);
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
        var auth = TestAuthentication.GetUserAuthentication(userPartyId: 65434312);
        using var fixture = InstancesControllerFixture.Create(auth);
        fixture
            .Mock<HttpContext>()
            .Setup(httpContext => httpContext.User)
            .Returns(TestAuthentication.GetUserPrincipal(65434312));
        const string Org = "ttd";
        const string AppName = "copy-instance";
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
        const string Org = "ttd";
        const string AppName = "copy-instance";
        int instanceOwnerPartyId = 343234;
        Guid instanceGuid = Guid.NewGuid();
        Instance instance = new()
        {
            Id = $"{instanceOwnerPartyId}/{instanceGuid}",
            Status = new InstanceStatus() { IsArchived = false },
        };
        var auth = TestAuthentication.GetUserAuthentication(userPartyId: instanceOwnerPartyId);
        using var fixture = InstancesControllerFixture.Create(auth);
        fixture
            .Mock<HttpContext>()
            .Setup(httpContext => httpContext.User)
            .Returns(TestAuthentication.GetUserPrincipal(partyId: instanceOwnerPartyId));

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
        const string Org = "ttd";
        const string AppName = "copy-instance";
        int instanceOwnerPartyId = 343234;
        Guid instanceGuid = Guid.NewGuid();
        var auth = TestAuthentication.GetUserAuthentication(userPartyId: instanceOwnerPartyId);
        using var fixture = InstancesControllerFixture.Create(auth);

        // Storage returns Forbidden if the given instance id is wrong.
        PlatformHttpException platformHttpException = await PlatformHttpException.CreateAsync(
            new HttpResponseMessage(System.Net.HttpStatusCode.Forbidden)
        );

        fixture
            .Mock<HttpContext>()
            .Setup(httpContext => httpContext.User)
            .Returns(TestAuthentication.GetUserPrincipal(partyId: instanceOwnerPartyId));
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
        const string Org = "ttd";
        const string AppName = "copy-instance";
        int instanceOwnerPartyId = 343234;
        Guid instanceGuid = Guid.NewGuid();
        var auth = TestAuthentication.GetUserAuthentication(userPartyId: instanceOwnerPartyId);
        using var fixture = InstancesControllerFixture.Create(auth);

        // Simulate a BadGateway respons from Platform
        PlatformHttpException platformHttpException = await PlatformHttpException.CreateAsync(
            new HttpResponseMessage(System.Net.HttpStatusCode.BadGateway)
        );

        fixture
            .Mock<HttpContext>()
            .Setup(httpContext => httpContext.User)
            .Returns(TestAuthentication.GetUserPrincipal(partyId: instanceOwnerPartyId));
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
        await Assert.ThrowsAsync<PlatformHttpException>(async () =>
            await controller.CopyInstance("ttd", "copy-instance", instanceOwnerPartyId, instanceGuid)
        );

        // Assert
        fixture.Mock<IAppMetadata>().VerifyAll();
        fixture.Mock<IPDP>().VerifyAll();
        fixture.Mock<IInstanceClient>().VerifyAll();
        fixture.VerifyNoOtherCalls();
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
        var auth = TestAuthentication.GetUserAuthentication(userPartyId: instanceOwnerPartyId);
        using var fixture = InstancesControllerFixture.Create(auth);

        fixture
            .Mock<HttpContext>()
            .Setup(httpContext => httpContext.User)
            .Returns(TestAuthentication.GetUserPrincipal(partyId: instanceOwnerPartyId));
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
        const string Org = "ttd";
        const string AppName = "copy-instance";
        const int instanceOwnerPartyId = 343234;
        Guid instanceGuid = Guid.NewGuid();
        Guid dataGuid = Guid.NewGuid();
        const string dataTypeId = "data_type_1";
        Instance instance = new()
        {
            Id = $"{instanceOwnerPartyId}/{instanceGuid}",
            AppId = $"{Org}/{AppName}",
            InstanceOwner = new InstanceOwner() { PartyId = instanceOwnerPartyId.ToString() },
            Status = new InstanceStatus() { IsArchived = true },
            Process = new ProcessState() { CurrentTask = new ProcessElementInfo() { ElementId = "First" } },
            Data = new List<DataElement>
            {
                new DataElement { Id = dataGuid.ToString(), DataType = dataTypeId },
            },
        };
        InstantiationValidationResult? instantiationValidationResult = new() { Valid = true };
        var auth = TestAuthentication.GetUserAuthentication(userPartyId: instanceOwnerPartyId);
        using var fixture = InstancesControllerFixture.Create(auth);

        fixture
            .Mock<HttpContext>()
            .Setup(httpContext => httpContext.User)
            .Returns(TestAuthentication.GetUserPrincipal(partyId: instanceOwnerPartyId));
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
            .Setup(p =>
                p.GetFormData(
                    It.IsAny<Instance>(),
                    It.IsAny<DataElement>(),
                    It.IsAny<StorageAuthenticationMethod>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new { test = "test" });
        fixture
            .Mock<IDataClient>()
            .Setup(p =>
                p.InsertFormData(
                    It.IsAny<Instance>(),
                    dataTypeId,
                    It.IsAny<object>(),
                    It.IsAny<StorageAuthenticationMethod>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new DataElement());

        // Act
        var controller = fixture.ServiceProvider.GetRequiredService<InstancesController>();
        ActionResult actual = await controller.CopyInstance(Org, AppName, instanceOwnerPartyId, instanceGuid);

        // Assert
        Assert.IsType<RedirectResult>(actual);
        RedirectResult objectResult = (RedirectResult)actual;
        Assert.Contains($"/#/instance/{instanceOwnerPartyId}/", objectResult.Url);

        fixture.Mock<IAppMetadata>().VerifyAll();
        fixture.Mock<IPDP>().VerifyAll();
        fixture.Mock<IInstanceClient>().VerifyAll();
        fixture.Mock<IProcessEngine>().VerifyAll();
        fixture.Mock<IInstantiationValidator>().VerifyAll();
    }

    [Fact]
    public async Task CopyInstance_WithBinaryData_CopiesBothFormAndBinaryData()
    {
        // Arrange
        const int instanceOwnerPartyId = 343234;
        var auth = TestAuthentication.GetUserAuthentication(userPartyId: instanceOwnerPartyId);
        using var fixture = InstancesControllerFixture.Create(auth);
        const string Org = "ttd";
        const string AppName = "copy-instance";
        Guid instanceGuid = Guid.NewGuid();
        Guid formDataGuid = Guid.NewGuid();
        Guid binaryDataGuid = Guid.NewGuid();
        const string formDataTypeId = "data_type_1";
        const string binaryDataTypeId = "attachment";

        var binaryDataBytes = System.Text.Encoding.UTF8.GetBytes("Test file content");

        Instance instance = new()
        {
            Id = $"{instanceOwnerPartyId}/{instanceGuid}",
            AppId = $"{Org}/{AppName}",
            InstanceOwner = new InstanceOwner() { PartyId = instanceOwnerPartyId.ToString() },
            Status = new InstanceStatus() { IsArchived = true },
            Process = new ProcessState() { CurrentTask = new ProcessElementInfo() { ElementId = "First" } },
            Data = new List<DataElement>
            {
                // Form data element
                new DataElement { Id = formDataGuid.ToString(), DataType = formDataTypeId },
                // Binary data element
                new DataElement
                {
                    Id = binaryDataGuid.ToString(),
                    DataType = binaryDataTypeId,
                    ContentType = "application/pdf",
                    Filename = "test.pdf",
                    Size = binaryDataBytes.Length,
                },
            },
        };
        InstantiationValidationResult? instantiationValidationResult = new() { Valid = true };

        fixture
            .Mock<HttpContext>()
            .Setup(hc => hc.User)
            .Returns(TestAuthentication.GetUserPrincipal(1337, instanceOwnerPartyId));
        fixture.Mock<HttpContext>().Setup(hc => hc.Request).Returns(Mock.Of<HttpRequest>());
        // Create app metadata with IncludeAttachments = true to enable binary data copying
        var appMetadata = CreateApplicationMetadata(Org, AppName, true);
        appMetadata.CopyInstanceSettings.IncludeAttachments = true;
        fixture.Mock<IAppMetadata>().Setup(a => a.GetApplicationMetadata()).ReturnsAsync(appMetadata);
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
            .ReturnsAsync(() => new ProcessChangeResult() { Success = true });
        fixture
            .Mock<IProcessEngine>()
            .Setup(p =>
                p.HandleEventsAndUpdateStorage(
                    It.IsAny<Instance>(),
                    It.IsAny<Dictionary<string, string>>(),
                    It.IsAny<List<InstanceEvent>>()
                )
            );

        // Form data mocks
        fixture
            .Mock<IDataClient>()
            .Setup(p =>
                p.GetFormData(
                    It.Is<Instance>(i => i.Id == instance.Id),
                    It.Is<DataElement>(d => d.Id == formDataGuid.ToString()),
                    It.IsAny<StorageAuthenticationMethod>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new { test = "test" });
        fixture
            .Mock<IDataClient>()
            .Setup(p =>
                p.InsertFormData(
                    It.Is<Instance>(i => i.Id == instance.Id),
                    formDataTypeId,
                    It.IsAny<object>(),
                    It.IsAny<StorageAuthenticationMethod>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new DataElement());

        fixture
            .Mock<IDataClient>()
            .Setup(p =>
                p.GetBinaryData(
                    instanceOwnerPartyId,
                    instanceGuid,
                    binaryDataGuid,
                    It.IsAny<StorageAuthenticationMethod>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new MemoryStream(binaryDataBytes));
        fixture
            .Mock<IDataClient>()
            .Setup(p =>
                p.InsertBinaryData(
                    It.IsAny<string>(),
                    binaryDataTypeId,
                    "application/pdf",
                    "test.pdf",
                    It.IsAny<Stream>(),
                    It.IsAny<string>(),
                    It.IsAny<StorageAuthenticationMethod>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new DataElement());

        // Act
        var controller = fixture.ServiceProvider.GetRequiredService<InstancesController>();
        ActionResult actual = await controller.CopyInstance(Org, AppName, instanceOwnerPartyId, instanceGuid);

        // Assert
        Assert.IsType<RedirectResult>(actual);

        // Verify form data was copied (this should pass - existing functionality)
        fixture
            .Mock<IDataClient>()
            .Verify(
                p =>
                    p.GetFormData(
                        It.IsAny<Instance>(),
                        It.IsAny<DataElement>(),
                        It.IsAny<StorageAuthenticationMethod>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );
        fixture
            .Mock<IDataClient>()
            .Verify(
                p =>
                    p.InsertFormData(
                        It.IsAny<Instance>(),
                        formDataTypeId,
                        It.IsAny<object>(),
                        It.IsAny<StorageAuthenticationMethod>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );

        // Verify binary data was copied
        fixture
            .Mock<IDataClient>()
            .Verify(
                p =>
                    p.GetBinaryData(
                        instanceOwnerPartyId,
                        instanceGuid,
                        binaryDataGuid,
                        It.IsAny<StorageAuthenticationMethod>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );
        fixture
            .Mock<IDataClient>()
            .Verify(
                p =>
                    p.InsertBinaryData(
                        It.IsAny<string>(),
                        binaryDataTypeId,
                        "application/pdf",
                        "test.pdf",
                        It.IsAny<Stream>(),
                        It.IsAny<string>(),
                        It.IsAny<StorageAuthenticationMethod>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );
    }

    [Fact]
    public async Task CopyInstance_WithExcludedBinaryDataType_SkipsExcludedType()
    {
        // Arrange
        const int instanceOwnerPartyId = 343234;
        var auth = TestAuthentication.GetUserAuthentication(userPartyId: instanceOwnerPartyId);
        using var fixture = InstancesControllerFixture.Create(auth);
        const string Org = "ttd";
        const string AppName = "copy-instance";
        Guid instanceGuid = Guid.NewGuid();
        Guid formDataGuid = Guid.NewGuid();
        Guid binaryDataGuid = Guid.NewGuid();
        const string formDataTypeId = "data_type_1";
        const string binaryDataTypeId = "sensitive-attachment";

        var binaryDataBytes = System.Text.Encoding.UTF8.GetBytes("Sensitive content");

        Instance instance = new()
        {
            Id = $"{instanceOwnerPartyId}/{instanceGuid}",
            AppId = $"{Org}/{AppName}",
            InstanceOwner = new InstanceOwner() { PartyId = instanceOwnerPartyId.ToString() },
            Status = new InstanceStatus() { IsArchived = true },
            Process = new ProcessState() { CurrentTask = new ProcessElementInfo() { ElementId = "First" } },
            Data = new List<DataElement>
            {
                new DataElement { Id = formDataGuid.ToString(), DataType = formDataTypeId },
                new DataElement
                {
                    Id = binaryDataGuid.ToString(),
                    DataType = binaryDataTypeId,
                    ContentType = "application/pdf",
                    Filename = "sensitive.pdf",
                    Size = binaryDataBytes.Length,
                },
            },
        };
        InstantiationValidationResult? instantiationValidationResult = new() { Valid = true };

        // Create app metadata with excluded binary data type
        var appMetadata = CreateApplicationMetadata(Org, AppName, true);
        appMetadata.CopyInstanceSettings.ExcludedDataTypes = new List<string> { binaryDataTypeId };

        fixture
            .Mock<HttpContext>()
            .Setup(hc => hc.User)
            .Returns(TestAuthentication.GetUserPrincipal(1337, instanceOwnerPartyId));
        fixture.Mock<HttpContext>().Setup(hc => hc.Request).Returns(Mock.Of<HttpRequest>());
        fixture.Mock<IAppMetadata>().Setup(a => a.GetApplicationMetadata()).ReturnsAsync(appMetadata);
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
            .ReturnsAsync(() => new ProcessChangeResult() { Success = true });
        fixture
            .Mock<IProcessEngine>()
            .Setup(p =>
                p.HandleEventsAndUpdateStorage(
                    It.IsAny<Instance>(),
                    It.IsAny<Dictionary<string, string>>(),
                    It.IsAny<List<InstanceEvent>>()
                )
            );

        // Form data mocks (should be copied)
        fixture
            .Mock<IDataClient>()
            .Setup(p =>
                p.GetFormData(
                    It.Is<Instance>(i => i.Id == instance.Id),
                    It.Is<DataElement>(d => d.Id == formDataGuid.ToString()),
                    It.IsAny<StorageAuthenticationMethod>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new { test = "test" });
        fixture
            .Mock<IDataClient>()
            .Setup(p =>
                p.InsertFormData(
                    It.Is<Instance>(i => i.Id == instance.Id),
                    formDataTypeId,
                    It.IsAny<object>(),
                    It.IsAny<StorageAuthenticationMethod>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new DataElement());

        // Binary data mocks (should NOT be called - type is excluded)
        fixture
            .Mock<IDataClient>()
            .Setup(p =>
                p.GetBinaryData(
                    instanceOwnerPartyId,
                    instanceGuid,
                    binaryDataGuid,
                    It.IsAny<StorageAuthenticationMethod>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new MemoryStream(binaryDataBytes));
        fixture
            .Mock<IDataClient>()
            .Setup(p =>
                p.InsertBinaryData(
                    It.IsAny<string>(),
                    binaryDataTypeId,
                    "application/pdf",
                    "sensitive.pdf",
                    It.IsAny<Stream>(),
                    It.IsAny<string>(),
                    It.IsAny<StorageAuthenticationMethod>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new DataElement());

        // Act
        var controller = fixture.ServiceProvider.GetRequiredService<InstancesController>();
        ActionResult actual = await controller.CopyInstance(Org, AppName, instanceOwnerPartyId, instanceGuid);

        // Assert
        Assert.IsType<RedirectResult>(actual);

        // Verify form data was copied
        fixture
            .Mock<IDataClient>()
            .Verify(
                p =>
                    p.GetFormData(
                        It.Is<Instance>(i => i.Id == instance.Id),
                        It.Is<DataElement>(d => d.Id == formDataGuid.ToString()),
                        It.IsAny<StorageAuthenticationMethod>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );
        fixture
            .Mock<IDataClient>()
            .Verify(
                p =>
                    p.InsertFormData(
                        It.Is<Instance>(i => i.Id == instance.Id),
                        formDataTypeId,
                        It.IsAny<object>(),
                        It.IsAny<StorageAuthenticationMethod>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );

        // Verify binary data was NOT copied (excluded type)
        fixture
            .Mock<IDataClient>()
            .Verify(
                p =>
                    p.GetBinaryData(
                        instanceOwnerPartyId,
                        instanceGuid,
                        binaryDataGuid,
                        It.IsAny<StorageAuthenticationMethod>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Never
            );
        fixture
            .Mock<IDataClient>()
            .Verify(
                p =>
                    p.InsertBinaryData(
                        It.IsAny<string>(),
                        binaryDataTypeId,
                        "application/pdf",
                        "sensitive.pdf",
                        It.IsAny<Stream>(),
                        It.IsAny<string>(),
                        It.IsAny<StorageAuthenticationMethod>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Never
            );
    }

    [Fact]
    public async Task CopyInstance_IncludeAttachmentsIsTrue_CopiesBinaryData()
    {
        // Arrange
        const int instanceOwnerPartyId = 343234;
        var auth = TestAuthentication.GetUserAuthentication(userPartyId: instanceOwnerPartyId);
        using var fixture = InstancesControllerFixture.Create(auth);
        const string Org = "ttd";
        const string AppName = "copy-instance";
        Guid instanceGuid = Guid.NewGuid();
        Guid binaryDataGuid = Guid.NewGuid();
        const string binaryDataTypeId = "attachment";

        var binaryDataBytes = System.Text.Encoding.UTF8.GetBytes("Binary content");

        Instance instance = new()
        {
            Id = $"{instanceOwnerPartyId}/{instanceGuid}",
            AppId = $"{Org}/{AppName}",
            InstanceOwner = new InstanceOwner() { PartyId = instanceOwnerPartyId.ToString() },
            Status = new InstanceStatus() { IsArchived = true },
            Process = new ProcessState() { CurrentTask = new ProcessElementInfo() { ElementId = "First" } },
            Data = new List<DataElement>
            {
                // Only binary data element - no form data
                new DataElement
                {
                    Id = binaryDataGuid.ToString(),
                    DataType = binaryDataTypeId,
                    ContentType = "application/pdf",
                    Filename = "test.pdf",
                    Size = binaryDataBytes.Length,
                },
            },
        };
        InstantiationValidationResult? instantiationValidationResult = new() { Valid = true };

        // Create app metadata with IncludeAttachments = true
        var appMetadata = CreateApplicationMetadata(Org, AppName, true);
        appMetadata.CopyInstanceSettings.IncludeAttachments = true;

        fixture
            .Mock<HttpContext>()
            .Setup(hc => hc.User)
            .Returns(TestAuthentication.GetUserPrincipal(1337, instanceOwnerPartyId));
        fixture.Mock<HttpContext>().Setup(hc => hc.Request).Returns(Mock.Of<HttpRequest>());
        fixture.Mock<IAppMetadata>().Setup(a => a.GetApplicationMetadata()).ReturnsAsync(appMetadata);
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
            .ReturnsAsync(() => new ProcessChangeResult() { Success = true });
        fixture
            .Mock<IProcessEngine>()
            .Setup(p =>
                p.HandleEventsAndUpdateStorage(
                    It.IsAny<Instance>(),
                    It.IsAny<Dictionary<string, string>>(),
                    It.IsAny<List<InstanceEvent>>()
                )
            );

        // Binary data mocks (should be called)
        fixture
            .Mock<IDataClient>()
            .Setup(p =>
                p.GetBinaryData(
                    instanceOwnerPartyId,
                    instanceGuid,
                    binaryDataGuid,
                    It.IsAny<StorageAuthenticationMethod>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new MemoryStream(binaryDataBytes));
        fixture
            .Mock<IDataClient>()
            .Setup(p =>
                p.InsertBinaryData(
                    It.IsAny<string>(),
                    binaryDataTypeId,
                    "application/pdf",
                    "test.pdf",
                    It.IsAny<Stream>(),
                    It.IsAny<string>(),
                    It.IsAny<StorageAuthenticationMethod>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new DataElement());

        // Act
        var controller = fixture.ServiceProvider.GetRequiredService<InstancesController>();
        ActionResult actual = await controller.CopyInstance(Org, AppName, instanceOwnerPartyId, instanceGuid);

        // Assert
        Assert.IsType<RedirectResult>(actual);

        // Verify binary data was copied
        fixture
            .Mock<IDataClient>()
            .Verify(
                p =>
                    p.GetBinaryData(
                        instanceOwnerPartyId,
                        instanceGuid,
                        binaryDataGuid,
                        It.IsAny<StorageAuthenticationMethod>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );
        fixture
            .Mock<IDataClient>()
            .Verify(
                p =>
                    p.InsertBinaryData(
                        It.IsAny<string>(),
                        binaryDataTypeId,
                        "application/pdf",
                        "test.pdf",
                        It.IsAny<Stream>(),
                        It.IsAny<string>(),
                        It.IsAny<StorageAuthenticationMethod>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );

        // No form data calls should have been made
        fixture
            .Mock<IDataClient>()
            .Verify(
                p =>
                    p.GetFormData(
                        It.IsAny<Guid>(),
                        It.IsAny<Type?>()!,
                        It.IsAny<string>(),
                        It.IsAny<string>(),
                        It.IsAny<int>(),
                        It.IsAny<Guid>(),
                        It.IsAny<StorageAuthenticationMethod>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Never
            );
        fixture
            .Mock<IDataClient>()
            .Verify(
                p =>
                    p.InsertFormData(
                        It.IsAny<object>(),
                        It.IsAny<Guid>(),
                        It.IsAny<Type?>()!,
                        It.IsAny<string>(),
                        It.IsAny<string>(),
                        It.IsAny<int>(),
                        It.IsAny<string>(),
                        It.IsAny<StorageAuthenticationMethod>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Never
            );
        fixture
            .Mock<IDataClient>()
            .Verify(
                p =>
                    p.GetFormData(
                        It.IsAny<Instance>(),
                        It.IsAny<DataElement>(),
                        It.IsAny<StorageAuthenticationMethod>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Never
            );
        fixture
            .Mock<IDataClient>()
            .Verify(
                p =>
                    p.InsertFormData(
                        It.IsAny<Instance>(),
                        It.IsAny<string>(),
                        It.IsAny<object>(),
                        It.IsAny<StorageAuthenticationMethod>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Never
            );
    }

    [Fact]
    public async Task CopyInstance_OnlyBinaryData_NotCopiedByDefault()
    {
        // Arrange
        const int instanceOwnerPartyId = 343234;
        var auth = TestAuthentication.GetUserAuthentication(userPartyId: instanceOwnerPartyId);
        using var fixture = InstancesControllerFixture.Create(auth);
        const string Org = "ttd";
        const string AppName = "copy-instance";
        Guid instanceGuid = Guid.NewGuid();
        Guid binaryDataGuid = Guid.NewGuid();
        const string binaryDataTypeId = "attachment";

        var binaryDataBytes = System.Text.Encoding.UTF8.GetBytes("Only binary content");

        Instance instance = new()
        {
            Id = $"{instanceOwnerPartyId}/{instanceGuid}",
            AppId = $"{Org}/{AppName}",
            InstanceOwner = new InstanceOwner() { PartyId = instanceOwnerPartyId.ToString() },
            Status = new InstanceStatus() { IsArchived = true },
            Process = new ProcessState() { CurrentTask = new ProcessElementInfo() { ElementId = "First" } },
            Data = new List<DataElement>
            {
                // Only binary data element - no form data
                new DataElement
                {
                    Id = binaryDataGuid.ToString(),
                    DataType = binaryDataTypeId,
                    ContentType = "application/pdf",
                    Filename = "only-binary.pdf",
                    Size = binaryDataBytes.Length,
                },
            },
        };
        InstantiationValidationResult? instantiationValidationResult = new() { Valid = true };

        fixture
            .Mock<HttpContext>()
            .Setup(hc => hc.User)
            .Returns(TestAuthentication.GetUserPrincipal(1337, instanceOwnerPartyId));
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
            .ReturnsAsync(() => new ProcessChangeResult() { Success = true });
        fixture
            .Mock<IProcessEngine>()
            .Setup(p =>
                p.HandleEventsAndUpdateStorage(
                    It.IsAny<Instance>(),
                    It.IsAny<Dictionary<string, string>>(),
                    It.IsAny<List<InstanceEvent>>()
                )
            );

        // Binary data mocks (should be called)
        fixture
            .Mock<IDataClient>()
            .Setup(p =>
                p.GetBinaryData(
                    instanceOwnerPartyId,
                    instanceGuid,
                    binaryDataGuid,
                    It.IsAny<StorageAuthenticationMethod>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new MemoryStream(binaryDataBytes));
        fixture
            .Mock<IDataClient>()
            .Setup(p =>
                p.InsertBinaryData(
                    It.IsAny<string>(),
                    binaryDataTypeId,
                    "application/pdf",
                    "only-binary.pdf",
                    It.IsAny<Stream>(),
                    It.IsAny<string>(),
                    It.IsAny<StorageAuthenticationMethod>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new DataElement());

        // Act
        var controller = fixture.ServiceProvider.GetRequiredService<InstancesController>();
        ActionResult actual = await controller.CopyInstance(Org, AppName, instanceOwnerPartyId, instanceGuid);

        // Assert
        Assert.IsType<RedirectResult>(actual);

        // Verify binary data was NOT copied (IncludeAttachments is null by default)
        fixture
            .Mock<IDataClient>()
            .Verify(
                p =>
                    p.GetBinaryData(
                        instanceOwnerPartyId,
                        instanceGuid,
                        binaryDataGuid,
                        It.IsAny<StorageAuthenticationMethod>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Never
            );
        fixture
            .Mock<IDataClient>()
            .Verify(
                p =>
                    p.InsertBinaryData(
                        It.IsAny<string>(),
                        binaryDataTypeId,
                        "application/pdf",
                        "only-binary.pdf",
                        It.IsAny<Stream>(),
                        It.IsAny<string>(),
                        It.IsAny<StorageAuthenticationMethod>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Never
            );

        // No form data calls should have been made
        fixture
            .Mock<IDataClient>()
            .Verify(
                p =>
                    p.GetFormData(
                        It.IsAny<Guid>(),
                        It.IsAny<Type?>()!,
                        It.IsAny<string>(),
                        It.IsAny<string>(),
                        It.IsAny<int>(),
                        It.IsAny<Guid>(),
                        It.IsAny<StorageAuthenticationMethod>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Never
            );
        fixture
            .Mock<IDataClient>()
            .Verify(
                p =>
                    p.InsertFormData(
                        It.IsAny<object>(),
                        It.IsAny<Guid>(),
                        It.IsAny<Type?>()!,
                        It.IsAny<string>(),
                        It.IsAny<string>(),
                        It.IsAny<int>(),
                        It.IsAny<string>(),
                        It.IsAny<StorageAuthenticationMethod>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Never
            );
    }

    private static ApplicationMetadata CreateApplicationMetadata(string org, string app, bool enableCopyInstance)
    {
        return new($"{org}/{app}")
        {
            CopyInstanceSettings = new CopyInstanceSettings { Enabled = enableCopyInstance },
            DataTypes = new List<DataType>
            {
                // Form data type (has AppLogic.ClassRef)
                new DataType
                {
                    Id = "data_type_1",
                    AppLogic = new ApplicationLogic { ClassRef = "App.Models.Skjema" },
                    TaskId = "First",
                },
                // Binary data types (no AppLogic.ClassRef)
                new DataType
                {
                    Id = "attachment",
                    TaskId = "First",
                    MaxSize = 25 * 1024 * 1024,
                    MaxCount = 10,
                },
                new DataType
                {
                    Id = "sensitive-attachment",
                    TaskId = "First",
                    MaxSize = 10 * 1024 * 1024,
                    MaxCount = 5,
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
