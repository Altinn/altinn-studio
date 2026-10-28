using System.Text;
using System.Text.Json.Serialization;
using System.Xml.Serialization;
using Altinn.App.Api.Controllers;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Notifications.Future;
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
    private static readonly StorageVersionMetadata SourceVersions = new(InstanceVersion: 12, ProcessStateVersion: 6);
    private static readonly StorageVersionMetadata TargetVersions = new(InstanceVersion: 3, ProcessStateVersion: 1);
    private static readonly string CopiedFormClassRef = typeof(CopiedForm).FullName!;

    [Fact]
    public async Task CopyInstance_CopyInstanceNotDefined_ReturnsBadRequest()
    {
        // Arrange
        var auth = TestAuthentication.GetUserAuthentication(userPartyId: 343234);
        using var fixture = InstancesControllerFixture.Create(auth);
        ApplicationMetadata application = new("ttd/copy-instance") { };
        fixture.Mock<IAppMetadata>().Setup(a => a.ApplicationMetadata).Returns(application);

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
            .Setup(a => a.ApplicationMetadata)
            .Returns(CreateApplicationMetadata(Org, AppName, false));

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
            .Setup(a => a.ApplicationMetadata)
            .Returns(CreateApplicationMetadata(Org, AppName, true));
        fixture
            .Mock<IPDP>()
            .Setup<Task<XacmlJsonResponse>>(p =>
                p.GetDecisionForRequest(It.IsAny<XacmlJsonRequestRoot>(), It.IsAny<CancellationToken>())
            )
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
            .Setup(a => a.ApplicationMetadata)
            .Returns(CreateApplicationMetadata(Org, AppName, true));
        fixture
            .Mock<IPDP>()
            .Setup<Task<XacmlJsonResponse>>(p =>
                p.GetDecisionForRequest(It.IsAny<XacmlJsonRequestRoot>(), It.IsAny<CancellationToken>())
            )
            .ReturnsAsync(CreateXacmlResponse("Permit"));
        fixture
            .Mock<IInstanceClientWithStorageMetadata>()
            .Setup(i =>
                i.GetInstanceWithStorageMetadata(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<int>(),
                    It.IsAny<Guid>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new InstanceWithStorageMetadata(instance, SourceVersions));

        // Act
        var controller = fixture.ServiceProvider.GetRequiredService<InstancesController>();
        ActionResult actual = await controller.CopyInstance("ttd", "copy-instance", instanceOwnerPartyId, instanceGuid);

        // Assert
        Assert.IsType<BadRequestObjectResult>(actual);
        BadRequestObjectResult badRequest = (BadRequestObjectResult)actual;
        Assert.Contains("instance being copied must be archived", badRequest!.Value!.ToString());

        fixture.Mock<IAppMetadata>().VerifyAll();
        fixture.Mock<IPDP>().VerifyAll();
        fixture.Mock<IInstanceClientWithStorageMetadata>().VerifyAll();
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
        PlatformHttpException platformHttpException = await PlatformHttpException.Create(
            new HttpResponseMessage(System.Net.HttpStatusCode.Forbidden)
        );

        fixture
            .Mock<HttpContext>()
            .Setup(httpContext => httpContext.User)
            .Returns(TestAuthentication.GetUserPrincipal(partyId: instanceOwnerPartyId));
        fixture
            .Mock<IAppMetadata>()
            .Setup(a => a.ApplicationMetadata)
            .Returns(CreateApplicationMetadata(Org, AppName, true));
        fixture
            .Mock<IPDP>()
            .Setup<Task<XacmlJsonResponse>>(p =>
                p.GetDecisionForRequest(It.IsAny<XacmlJsonRequestRoot>(), It.IsAny<CancellationToken>())
            )
            .ReturnsAsync(CreateXacmlResponse("Permit"));
        fixture
            .Mock<IInstanceClientWithStorageMetadata>()
            .Setup(i =>
                i.GetInstanceWithStorageMetadata(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<int>(),
                    It.IsAny<Guid>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
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
        fixture.Mock<IInstanceClientWithStorageMetadata>().VerifyAll();
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
        PlatformHttpException platformHttpException = await PlatformHttpException.Create(
            new HttpResponseMessage(System.Net.HttpStatusCode.BadGateway)
        );

        fixture
            .Mock<HttpContext>()
            .Setup(httpContext => httpContext.User)
            .Returns(TestAuthentication.GetUserPrincipal(partyId: instanceOwnerPartyId));
        fixture
            .Mock<IAppMetadata>()
            .Setup(a => a.ApplicationMetadata)
            .Returns(CreateApplicationMetadata(Org, AppName, true));
        fixture
            .Mock<IPDP>()
            .Setup<Task<XacmlJsonResponse>>(p =>
                p.GetDecisionForRequest(It.IsAny<XacmlJsonRequestRoot>(), It.IsAny<CancellationToken>())
            )
            .ReturnsAsync(CreateXacmlResponse("Permit"));
        fixture
            .Mock<IInstanceClientWithStorageMetadata>()
            .Setup(i =>
                i.GetInstanceWithStorageMetadata(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<int>(),
                    It.IsAny<Guid>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(platformHttpException);

        // Act
        var controller = fixture.ServiceProvider.GetRequiredService<InstancesController>();
        await Assert.ThrowsAsync<PlatformHttpException>(async () =>
            await controller.CopyInstance("ttd", "copy-instance", instanceOwnerPartyId, instanceGuid)
        );

        // Assert
        fixture.Mock<IAppMetadata>().VerifyAll();
        fixture.Mock<IPDP>().VerifyAll();
        fixture.Mock<IInstanceClientWithStorageMetadata>().VerifyAll();
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
        SetupRequestAcceptHeader(fixture, "application/json");
        fixture
            .Mock<IAppMetadata>()
            .Setup(a => a.ApplicationMetadata)
            .Returns(CreateApplicationMetadata(Org, AppName, true));
        fixture
            .Mock<IPDP>()
            .Setup<Task<XacmlJsonResponse>>(p =>
                p.GetDecisionForRequest(It.IsAny<XacmlJsonRequestRoot>(), It.IsAny<CancellationToken>())
            )
            .ReturnsAsync(CreateXacmlResponse("Permit"));
        fixture
            .Mock<IInstanceClientWithStorageMetadata>()
            .Setup(i =>
                i.GetInstanceWithStorageMetadata(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<int>(),
                    It.IsAny<Guid>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new InstanceWithStorageMetadata(instance, SourceVersions));
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
        Assert.Same(instantiationValidationResult, objectResult.Value);

        fixture.Mock<IAppMetadata>().VerifyAll();
        fixture.Mock<IPDP>().VerifyAll();
        fixture.Mock<IInstanceClientWithStorageMetadata>().VerifyAll();
        fixture.Mock<IInstantiationValidator>().VerifyAll();

        fixture.VerifyNoOtherCalls();
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("*/*")]
    [InlineData("application/json")]
    [InlineData("application/json, text/html;q=0.9")]
    [InlineData("text/html;q=0.9, */*")]
    [InlineData("text/*;q=0.5, application/*")]
    [InlineData("text/plain")]
    public async Task CopyInstance_CopyInstanceValidationFails_ReturnsJsonWhenHtmlNotPreferred(string? acceptHeader)
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
        InstantiationValidationResult? copyInstanceValidationResult = new()
        {
            Valid = false,
            Message = "Copy not allowed",
        };
        var auth = TestAuthentication.GetUserAuthentication(userPartyId: instanceOwnerPartyId);
        using var fixture = InstancesControllerFixture.Create(auth);

        fixture
            .Mock<HttpContext>()
            .Setup(httpContext => httpContext.User)
            .Returns(TestAuthentication.GetUserPrincipal(partyId: instanceOwnerPartyId));
        SetupRequestAcceptHeader(fixture, acceptHeader);
        fixture
            .Mock<IAppMetadata>()
            .Setup(a => a.ApplicationMetadata)
            .Returns(CreateApplicationMetadata(Org, AppName, true));
        fixture
            .Mock<IPDP>()
            .Setup<Task<XacmlJsonResponse>>(p =>
                p.GetDecisionForRequest(It.IsAny<XacmlJsonRequestRoot>(), It.IsAny<CancellationToken>())
            )
            .ReturnsAsync(CreateXacmlResponse("Permit"));
        fixture
            .Mock<IInstanceClientWithStorageMetadata>()
            .Setup(i =>
                i.GetInstanceWithStorageMetadata(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<int>(),
                    It.IsAny<Guid>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new InstanceWithStorageMetadata(instance, SourceVersions));
        fixture
            .Mock<IInstantiationValidator>()
            .Setup(v => v.Validate(It.IsAny<Instance>()))
            .ReturnsAsync((InstantiationValidationResult?)null);
        fixture
            .Mock<ICopyInstanceValidator>()
            .Setup(v => v.Validate(It.IsAny<IInstanceDataAccessor>()))
            .ReturnsAsync(copyInstanceValidationResult);

        // Act
        var controller = fixture.ServiceProvider.GetRequiredService<InstancesController>();
        ActionResult actual = await controller.CopyInstance("ttd", "copy-instance", instanceOwnerPartyId, instanceGuid);

        // Assert
        ObjectResult objectResult = Assert.IsType<ObjectResult>(actual);
        Assert.Equal(403, objectResult.StatusCode);
        Assert.Same(copyInstanceValidationResult, objectResult.Value);

        fixture.Mock<IAppMetadata>().VerifyAll();
        fixture.Mock<IPDP>().VerifyAll();
        fixture.Mock<IInstanceClientWithStorageMetadata>().VerifyAll();
        fixture.Mock<IInstantiationValidator>().VerifyAll();
        fixture.Mock<ICopyInstanceValidator>().VerifyAll();

        fixture.VerifyNoOtherCalls();
    }

    [Theory]
    [InlineData("text/html")]
    [InlineData("text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8")]
    [InlineData("application/json;q=0.5, text/html")]
    [InlineData("text/*")]
    [InlineData("text/html, */*;q=0.1")]
    [InlineData("application/json;q=0.2, */*")]
    public async Task CopyInstance_CopyInstanceValidationFails_ReturnsHtmlWhenHtmlPreferred(string acceptHeader)
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
        InstantiationValidationResult? copyInstanceValidationResult = new()
        {
            Valid = false,
            Message = "Copy not allowed <b>before</b> 2027",
        };
        var auth = TestAuthentication.GetUserAuthentication(userPartyId: instanceOwnerPartyId);
        using var fixture = InstancesControllerFixture.Create(auth);

        fixture
            .Mock<HttpContext>()
            .Setup(httpContext => httpContext.User)
            .Returns(TestAuthentication.GetUserPrincipal(partyId: instanceOwnerPartyId));
        SetupRequestAcceptHeader(fixture, acceptHeader);
        var application = CreateApplicationMetadata(Org, AppName, true);
        application.Title = new Dictionary<string, string> { ["nb"] = "Skjema <AS>", ["en"] = "Form <Ltd>" };
        fixture.Mock<IAppMetadata>().Setup(a => a.ApplicationMetadata).Returns(application);
        fixture
            .Mock<IPDP>()
            .Setup<Task<XacmlJsonResponse>>(p =>
                p.GetDecisionForRequest(It.IsAny<XacmlJsonRequestRoot>(), It.IsAny<CancellationToken>())
            )
            .ReturnsAsync(CreateXacmlResponse("Permit"));
        fixture
            .Mock<IInstanceClientWithStorageMetadata>()
            .Setup(i =>
                i.GetInstanceWithStorageMetadata(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<int>(),
                    It.IsAny<Guid>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new InstanceWithStorageMetadata(instance, SourceVersions));
        fixture
            .Mock<IInstantiationValidator>()
            .Setup(v => v.Validate(It.IsAny<Instance>()))
            .ReturnsAsync((InstantiationValidationResult?)null);
        fixture
            .Mock<ICopyInstanceValidator>()
            .Setup(v => v.Validate(It.IsAny<IInstanceDataAccessor>()))
            .ReturnsAsync(copyInstanceValidationResult);

        // Act
        var controller = fixture.ServiceProvider.GetRequiredService<InstancesController>();
        ActionResult actual = await controller.CopyInstance(
            "ttd",
            "copy-instance",
            instanceOwnerPartyId,
            instanceGuid,
            language: "en"
        );

        // Assert
        ContentResult contentResult = Assert.IsType<ContentResult>(actual);
        Assert.Equal(403, contentResult.StatusCode);
        Assert.Equal("text/html; charset=utf-8", contentResult.ContentType);
        Assert.NotNull(contentResult.Content);
        Assert.StartsWith("<!DOCTYPE html>", contentResult.Content);
        Assert.Contains("<html lang=\"en\">", contentResult.Content);
        Assert.Contains("<h1>Form &lt;Ltd&gt;</h1>", contentResult.Content);
        Assert.Contains("<p>Copy not allowed &lt;b&gt;before&lt;/b&gt; 2027</p>", contentResult.Content);
        Assert.DoesNotContain("<b>", contentResult.Content);

        fixture.Mock<IAppMetadata>().VerifyAll();
        fixture.Mock<IPDP>().VerifyAll();
        fixture.Mock<IInstanceClientWithStorageMetadata>().VerifyAll();
        fixture.Mock<IInstantiationValidator>().VerifyAll();
        fixture.Mock<ICopyInstanceValidator>().VerifyAll();

        fixture.VerifyNoOtherCalls();
    }

    private static void SetupRequestAcceptHeader(InstancesControllerFixture fixture, string? acceptHeader)
    {
        IHeaderDictionary headers = new HeaderDictionary();
        if (acceptHeader is not null)
        {
            headers.Accept = acceptHeader;
        }
        var requestMock = new Mock<HttpRequest>(MockBehavior.Strict);
        requestMock.Setup(r => r.Headers).Returns(headers);
        fixture.Mock<HttpContext>().Setup(httpContext => httpContext.Request).Returns(requestMock.Object);
    }

    [Fact]
    public async Task CopyInstance_CopyInstanceValidationFails_ReturnsForbidden()
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
        InstantiationValidationResult? instantiationValidationResult = new() { Valid = true };
        InstantiationValidationResult? copyInstanceValidationResult = new() { Valid = false };
        var auth = TestAuthentication.GetUserAuthentication(userPartyId: instanceOwnerPartyId);
        using var fixture = InstancesControllerFixture.Create(auth);

        fixture
            .Mock<HttpContext>()
            .Setup(httpContext => httpContext.User)
            .Returns(TestAuthentication.GetUserPrincipal(partyId: instanceOwnerPartyId));
        SetupRequestAcceptHeader(fixture, "application/json");
        fixture
            .Mock<IAppMetadata>()
            .Setup(a => a.ApplicationMetadata)
            .Returns(CreateApplicationMetadata(Org, AppName, true));
        fixture
            .Mock<IPDP>()
            .Setup<Task<XacmlJsonResponse>>(p =>
                p.GetDecisionForRequest(It.IsAny<XacmlJsonRequestRoot>(), It.IsAny<CancellationToken>())
            )
            .ReturnsAsync(CreateXacmlResponse("Permit"));
        fixture
            .Mock<IInstanceClientWithStorageMetadata>()
            .Setup(i =>
                i.GetInstanceWithStorageMetadata(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<int>(),
                    It.IsAny<Guid>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new InstanceWithStorageMetadata(instance, SourceVersions));
        fixture
            .Mock<IInstantiationValidator>()
            .Setup(v => v.Validate(It.IsAny<Instance>()))
            .ReturnsAsync(instantiationValidationResult);
        fixture
            .Mock<ICopyInstanceValidator>()
            .Setup(v => v.Validate(It.IsAny<IInstanceDataAccessor>()))
            .ReturnsAsync(copyInstanceValidationResult);

        // Act
        var controller = fixture.ServiceProvider.GetRequiredService<InstancesController>();
        ActionResult actual = await controller.CopyInstance("ttd", "copy-instance", instanceOwnerPartyId, instanceGuid);

        // Assert
        Assert.IsType<ObjectResult>(actual);
        ObjectResult objectResult = (ObjectResult)actual;
        Assert.Equal(403, objectResult.StatusCode);

        fixture.Mock<IAppMetadata>().VerifyAll();
        fixture.Mock<IPDP>().VerifyAll();
        fixture.Mock<IInstanceClientWithStorageMetadata>().VerifyAll();
        fixture.Mock<IInstantiationValidator>().VerifyAll();
        fixture.Mock<ICopyInstanceValidator>().VerifyAll();

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
        Guid targetInstanceGuid = Guid.NewGuid();
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
        var targetProcessState = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "First" } };
        var targetInstance = new Instance
        {
            Id = $"{instanceOwnerPartyId}/{targetInstanceGuid}",
            AppId = $"{Org}/{AppName}",
            Org = Org,
            InstanceOwner = new InstanceOwner { PartyId = instanceOwnerPartyId.ToString() },
            Status = new InstanceStatus { ReadStatus = ReadStatus.Read },
            Process = targetProcessState,
            Data = [],
        };
        var processStateChange = new ProcessStateChange
        {
            OldProcessState = null,
            NewProcessState = targetProcessState,
            Events = [],
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
            .Setup(a => a.ApplicationMetadata)
            .Returns(CreateApplicationMetadata(Org, AppName, true));
        fixture
            .Mock<IPDP>()
            .Setup<Task<XacmlJsonResponse>>(p =>
                p.GetDecisionForRequest(It.IsAny<XacmlJsonRequestRoot>(), It.IsAny<CancellationToken>())
            )
            .ReturnsAsync(CreateXacmlResponse("Permit"));
        fixture
            .Mock<IInstanceClientWithStorageMetadata>()
            .Setup(i =>
                i.GetInstanceWithStorageMetadata(
                    AppName,
                    Org,
                    instanceOwnerPartyId,
                    instanceGuid,
                    null,
                    CancellationToken.None
                )
            )
            .ReturnsAsync(new InstanceWithStorageMetadata(instance, SourceVersions));
        fixture
            .Mock<IInstanceClient>()
            .Setup(i =>
                i.CreateInstance(
                    Org,
                    AppName,
                    It.Is<Instance>(candidate =>
                        candidate.InstanceOwner.PartyId == instanceOwnerPartyId.ToString()
                        && ReferenceEquals(candidate.Process, targetProcessState)
                    ),
                    null,
                    CancellationToken.None
                )
            )
            .ReturnsAsync(targetInstance);
        fixture
            .Mock<IInstanceClientWithStorageMetadata>()
            .Setup(i =>
                i.GetInstanceWithStorageMetadata(
                    It.Is<Instance>(candidate => ReferenceEquals(candidate, targetInstance)),
                    null,
                    CancellationToken.None
                )
            )
            .ReturnsAsync(new InstanceWithStorageMetadata(targetInstance, TargetVersions));
        fixture
            .Mock<IInstantiationValidator>()
            .Setup(v => v.Validate(It.IsAny<Instance>()))
            .ReturnsAsync(instantiationValidationResult);
        fixture
            .Mock<ICopyInstanceValidator>()
            .Setup(v => v.Validate(It.IsAny<IInstanceDataAccessor>()))
            .ReturnsAsync(instantiationValidationResult);
        fixture
            .Mock<IProcessEngine>()
            .Setup(p =>
                p.CreateInitialProcessState(
                    It.Is<ProcessStartRequest>(request =>
                        request.Instance.InstanceOwner.PartyId == instanceOwnerPartyId.ToString()
                    )
                )
            )
            .ReturnsAsync(
                (ProcessStartRequest request) =>
                {
                    request.Instance.Process = targetProcessState;
                    return new ProcessChangeResult { Success = true, ProcessStateChange = processStateChange };
                }
            );
        fixture
            .Mock<IProcessEngine>()
            .Setup(p =>
                p.SubmitInitialProcessState(
                    It.Is<Instance>(candidate => ReferenceEquals(candidate, targetInstance)),
                    TargetVersions,
                    It.Is<ProcessStateChange>(change => ReferenceEquals(change, processStateChange)),
                    true,
                    null,
                    null,
                    null,
                    CancellationToken.None
                )
            )
            .ReturnsAsync(targetInstance);
        fixture
            .Mock<IDataClient>()
            .Setup(p =>
                p.GetFormData(
                    It.IsAny<Instance>(),
                    It.IsAny<DataElement>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(() => new CopiedForm());
        SetupFormDataSave(fixture, targetInstance);

        // Act
        var controller = fixture.ServiceProvider.GetRequiredService<InstancesController>();
        ActionResult actual = await controller.CopyInstance(Org, AppName, instanceOwnerPartyId, instanceGuid);

        // Assert
        Assert.IsType<RedirectResult>(actual);
        RedirectResult objectResult = (RedirectResult)actual;
        Assert.Contains($"/instance/{instanceOwnerPartyId}/", objectResult.Url);

        fixture.Mock<IAppMetadata>().VerifyAll();
        fixture.Mock<IPDP>().VerifyAll();
        fixture.Mock<IInstanceClientWithStorageMetadata>().VerifyAll();
        fixture
            .Mock<IProcessEngine>()
            .Verify(
                p =>
                    p.SubmitInitialProcessState(
                        It.Is<Instance>(candidate => ReferenceEquals(candidate, targetInstance)),
                        TargetVersions,
                        It.Is<ProcessStateChange>(change => ReferenceEquals(change, processStateChange)),
                        true,
                        null,
                        null,
                        null,
                        CancellationToken.None
                    ),
                Times.Once
            );
        fixture.Mock<IProcessEngine>().VerifyAll();
        fixture.Mock<IInstantiationValidator>().VerifyAll();
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task CopyInstance_WithBinaryData_CopiesBothFormAndBinaryData(bool severalTasks)
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
        if (severalTasks)
        {
            foreach (var dataType in appMetadata.DataTypes)
            {
                dataType.TaskIds = ["Earlier", "First"];
            }
        }
        fixture.Mock<IAppMetadata>().Setup(a => a.ApplicationMetadata).Returns(appMetadata);
        fixture
            .Mock<IPDP>()
            .Setup<Task<XacmlJsonResponse>>(p =>
                p.GetDecisionForRequest(It.IsAny<XacmlJsonRequestRoot>(), It.IsAny<CancellationToken>())
            )
            .ReturnsAsync(CreateXacmlResponse("Permit"));
        fixture
            .Mock<IInstanceClientWithStorageMetadata>()
            .Setup(i =>
                i.GetInstanceWithStorageMetadata(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<int>(),
                    It.IsAny<Guid>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new InstanceWithStorageMetadata(instance, SourceVersions));
        fixture
            .Mock<IInstanceClient>()
            .Setup(i =>
                i.CreateInstance(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<Instance>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(instance);
        fixture
            .Mock<IInstanceClientWithStorageMetadata>()
            .Setup(i =>
                i.GetInstanceWithStorageMetadata(
                    It.IsAny<Instance>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new InstanceWithStorageMetadata(instance, TargetVersions));
        fixture
            .Mock<IInstantiationValidator>()
            .Setup(v => v.Validate(It.IsAny<Instance>()))
            .ReturnsAsync(instantiationValidationResult);
        fixture
            .Mock<ICopyInstanceValidator>()
            .Setup(v => v.Validate(It.IsAny<IInstanceDataAccessor>()))
            .ReturnsAsync(instantiationValidationResult);
        fixture
            .Mock<IProcessEngine>()
            .Setup(p => p.CreateInitialProcessState(It.IsAny<ProcessStartRequest>()))
            .ReturnsAsync(() => new ProcessChangeResult() { Success = true });

        // Form data mocks
        fixture
            .Mock<IDataClient>()
            .Setup(p =>
                p.GetFormData(
                    It.Is<Instance>(i => i.Id == instance.Id),
                    It.Is<DataElement>(d => d.Id == formDataGuid.ToString()),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(() => new CopiedForm());
        SetupFormDataSave(fixture, instance);

        fixture
            .Mock<IDataClient>()
            .Setup(p =>
                p.GetBinaryData(
                    instanceOwnerPartyId,
                    instanceGuid,
                    binaryDataGuid,
                    It.IsAny<StorageAuthenticationMethod?>(),
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
                    It.IsAny<StorageAuthenticationMethod?>(),
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
                        It.IsAny<StorageAuthenticationMethod?>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );
        StorageInstanceMutationCreateDataElement savedForm = Assert.Single(
            GetSavedMutation(fixture).Request.CreateDataElements
        );
        Assert.Equal(formDataTypeId, savedForm.DataType);

        // Verify binary data was copied
        fixture
            .Mock<IDataClient>()
            .Verify(
                p =>
                    p.GetBinaryData(
                        instanceOwnerPartyId,
                        instanceGuid,
                        binaryDataGuid,
                        It.IsAny<StorageAuthenticationMethod?>(),
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
                        It.IsAny<StorageAuthenticationMethod?>(),
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
        fixture.Mock<IAppMetadata>().Setup(a => a.ApplicationMetadata).Returns(appMetadata);
        fixture
            .Mock<IPDP>()
            .Setup<Task<XacmlJsonResponse>>(p =>
                p.GetDecisionForRequest(It.IsAny<XacmlJsonRequestRoot>(), It.IsAny<CancellationToken>())
            )
            .ReturnsAsync(CreateXacmlResponse("Permit"));
        fixture
            .Mock<IInstanceClientWithStorageMetadata>()
            .Setup(i =>
                i.GetInstanceWithStorageMetadata(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<int>(),
                    It.IsAny<Guid>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new InstanceWithStorageMetadata(instance, SourceVersions));
        fixture
            .Mock<IInstanceClient>()
            .Setup(i =>
                i.CreateInstance(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<Instance>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(instance);
        fixture
            .Mock<IInstanceClientWithStorageMetadata>()
            .Setup(i =>
                i.GetInstanceWithStorageMetadata(
                    It.IsAny<Instance>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new InstanceWithStorageMetadata(instance, TargetVersions));
        fixture
            .Mock<IInstantiationValidator>()
            .Setup(v => v.Validate(It.IsAny<Instance>()))
            .ReturnsAsync(instantiationValidationResult);
        fixture
            .Mock<ICopyInstanceValidator>()
            .Setup(v => v.Validate(It.IsAny<IInstanceDataAccessor>()))
            .ReturnsAsync(instantiationValidationResult);
        fixture
            .Mock<IProcessEngine>()
            .Setup(p => p.CreateInitialProcessState(It.IsAny<ProcessStartRequest>()))
            .ReturnsAsync(() => new ProcessChangeResult() { Success = true });

        // Form data mocks (should be copied)
        fixture
            .Mock<IDataClient>()
            .Setup(p =>
                p.GetFormData(
                    It.Is<Instance>(i => i.Id == instance.Id),
                    It.Is<DataElement>(d => d.Id == formDataGuid.ToString()),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(() => new CopiedForm());
        SetupFormDataSave(fixture, instance);

        // Binary data mocks (should NOT be called - type is excluded)
        fixture
            .Mock<IDataClient>()
            .Setup(p =>
                p.GetBinaryData(
                    instanceOwnerPartyId,
                    instanceGuid,
                    binaryDataGuid,
                    It.IsAny<StorageAuthenticationMethod?>(),
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
                    It.IsAny<StorageAuthenticationMethod?>(),
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
                        It.IsAny<StorageAuthenticationMethod?>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );
        StorageInstanceMutationCreateDataElement savedForm = Assert.Single(
            GetSavedMutation(fixture).Request.CreateDataElements
        );
        Assert.Equal(formDataTypeId, savedForm.DataType);

        // Verify binary data was NOT copied (excluded type)
        fixture
            .Mock<IDataClient>()
            .Verify(
                p =>
                    p.GetBinaryData(
                        instanceOwnerPartyId,
                        instanceGuid,
                        binaryDataGuid,
                        It.IsAny<StorageAuthenticationMethod?>(),
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
                        It.IsAny<StorageAuthenticationMethod?>(),
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
        fixture.Mock<IAppMetadata>().Setup(a => a.ApplicationMetadata).Returns(appMetadata);
        fixture
            .Mock<IPDP>()
            .Setup<Task<XacmlJsonResponse>>(p =>
                p.GetDecisionForRequest(It.IsAny<XacmlJsonRequestRoot>(), It.IsAny<CancellationToken>())
            )
            .ReturnsAsync(CreateXacmlResponse("Permit"));
        fixture
            .Mock<IInstanceClientWithStorageMetadata>()
            .Setup(i =>
                i.GetInstanceWithStorageMetadata(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<int>(),
                    It.IsAny<Guid>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new InstanceWithStorageMetadata(instance, SourceVersions));
        fixture
            .Mock<IInstanceClient>()
            .Setup(i =>
                i.CreateInstance(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<Instance>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(instance);
        fixture
            .Mock<IInstanceClientWithStorageMetadata>()
            .Setup(i =>
                i.GetInstanceWithStorageMetadata(
                    It.IsAny<Instance>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new InstanceWithStorageMetadata(instance, TargetVersions));
        fixture
            .Mock<IInstantiationValidator>()
            .Setup(v => v.Validate(It.IsAny<Instance>()))
            .ReturnsAsync(instantiationValidationResult);
        fixture
            .Mock<ICopyInstanceValidator>()
            .Setup(v => v.Validate(It.IsAny<IInstanceDataAccessor>()))
            .ReturnsAsync(instantiationValidationResult);
        fixture
            .Mock<IProcessEngine>()
            .Setup(p => p.CreateInitialProcessState(It.IsAny<ProcessStartRequest>()))
            .ReturnsAsync(() => new ProcessChangeResult() { Success = true });

        // Binary data mocks (should be called)
        fixture
            .Mock<IDataClient>()
            .Setup(p =>
                p.GetBinaryData(
                    instanceOwnerPartyId,
                    instanceGuid,
                    binaryDataGuid,
                    It.IsAny<StorageAuthenticationMethod?>(),
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
                    It.IsAny<StorageAuthenticationMethod?>(),
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
                        It.IsAny<StorageAuthenticationMethod?>(),
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
                        It.IsAny<StorageAuthenticationMethod?>(),
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
                        It.IsAny<StorageAuthenticationMethod?>(),
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
                        It.IsAny<StorageAuthenticationMethod?>(),
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
                        It.IsAny<StorageAuthenticationMethod?>(),
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
            .Setup(a => a.ApplicationMetadata)
            .Returns(CreateApplicationMetadata(Org, AppName, true));
        fixture
            .Mock<IPDP>()
            .Setup<Task<XacmlJsonResponse>>(p =>
                p.GetDecisionForRequest(It.IsAny<XacmlJsonRequestRoot>(), It.IsAny<CancellationToken>())
            )
            .ReturnsAsync(CreateXacmlResponse("Permit"));
        fixture
            .Mock<IInstanceClientWithStorageMetadata>()
            .Setup(i =>
                i.GetInstanceWithStorageMetadata(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<int>(),
                    It.IsAny<Guid>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new InstanceWithStorageMetadata(instance, SourceVersions));
        fixture
            .Mock<IInstanceClient>()
            .Setup(i =>
                i.CreateInstance(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<Instance>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(instance);
        fixture
            .Mock<IInstanceClientWithStorageMetadata>()
            .Setup(i =>
                i.GetInstanceWithStorageMetadata(
                    It.IsAny<Instance>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new InstanceWithStorageMetadata(instance, TargetVersions));
        fixture
            .Mock<IInstantiationValidator>()
            .Setup(v => v.Validate(It.IsAny<Instance>()))
            .ReturnsAsync(instantiationValidationResult);
        fixture
            .Mock<ICopyInstanceValidator>()
            .Setup(v => v.Validate(It.IsAny<IInstanceDataAccessor>()))
            .ReturnsAsync(instantiationValidationResult);
        fixture
            .Mock<IProcessEngine>()
            .Setup(p => p.CreateInitialProcessState(It.IsAny<ProcessStartRequest>()))
            .ReturnsAsync(() => new ProcessChangeResult() { Success = true });

        // Binary data mocks (should be called)
        fixture
            .Mock<IDataClient>()
            .Setup(p =>
                p.GetBinaryData(
                    instanceOwnerPartyId,
                    instanceGuid,
                    binaryDataGuid,
                    It.IsAny<StorageAuthenticationMethod?>(),
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
                    It.IsAny<StorageAuthenticationMethod?>(),
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
                        It.IsAny<StorageAuthenticationMethod?>(),
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
                        It.IsAny<StorageAuthenticationMethod?>(),
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
                        It.IsAny<StorageAuthenticationMethod?>(),
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
                        It.IsAny<StorageAuthenticationMethod?>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Never
            );
    }

    [Fact]
    public async Task CopyInstance_IncludedValuesConfigured_CopiesDueBeforeDataValuesAndPresentationTexts()
    {
        // Arrange
        const int instanceOwnerPartyId = 343234;
        DateTime dueBefore = new(2026, 12, 24, 12, 0, 0, DateTimeKind.Utc);
        Instance instance = CreateArchivedInstance(instanceOwnerPartyId);
        instance.DueBefore = dueBefore;
        instance.DataValues = new Dictionary<string, string>
        {
            ["appVersion"] = "1.2.3",
            ["customerId"] = "42",
            ["notCopied"] = "secret",
        };
        instance.PresentationTexts = new Dictionary<string, string>
        {
            ["name"] = "Ola Olsen",
            ["notCopied"] = "secret",
        };

        ApplicationMetadata application = CreateApplicationMetadata("ttd", "copy-instance", true);
        application.CopyInstanceSettings!.IncludeDueBefore = true;
        application.CopyInstanceSettings.IncludedDataValues = ["appVersion", "customerId", "missingOnSource"];
        application.CopyInstanceSettings.IncludedPresentationTexts = ["name", "missingOnSource"];

        var auth = TestAuthentication.GetUserAuthentication(userPartyId: instanceOwnerPartyId);
        using var fixture = InstancesControllerFixture.Create(auth);
        Func<Instance?> getInstanceTemplate = SetupSuccessfulCopy(fixture, instance, application);

        // Act
        var controller = fixture.ServiceProvider.GetRequiredService<InstancesController>();
        ActionResult actual = await controller.CopyInstance(
            "ttd",
            "copy-instance",
            instanceOwnerPartyId,
            Guid.Parse(instance.Id.Split("/")[1])
        );

        // Assert
        Assert.IsType<RedirectResult>(actual);
        Instance? instanceTemplate = getInstanceTemplate();
        Assert.NotNull(instanceTemplate);
        Assert.Equal(dueBefore, instanceTemplate.DueBefore);
        Assert.Equal(
            new Dictionary<string, string>
            {
                ["appVersion"] = "1.2.3",
                ["customerId"] = "42",
                [DataValueKeys.CopySourceInstanceId] = instance.Id,
            },
            instanceTemplate.DataValues
        );
        Assert.Equal(new Dictionary<string, string> { ["name"] = "Ola Olsen" }, instanceTemplate.PresentationTexts);
        VerifyNoSeparateDataValuesOrPresentationTextsUpdate(fixture);
    }

    [Fact]
    public async Task CopyInstance_IncludedValuesNotConfigured_OnlySetsSourceInstanceIdDataValue()
    {
        // Arrange
        const int instanceOwnerPartyId = 343234;
        Instance instance = CreateArchivedInstance(instanceOwnerPartyId);
        instance.DueBefore = new DateTime(2026, 12, 24, 12, 0, 0, DateTimeKind.Utc);
        instance.DataValues = new Dictionary<string, string> { ["appVersion"] = "1.2.3" };
        instance.PresentationTexts = new Dictionary<string, string> { ["name"] = "Ola Olsen" };

        ApplicationMetadata application = CreateApplicationMetadata("ttd", "copy-instance", true);

        var auth = TestAuthentication.GetUserAuthentication(userPartyId: instanceOwnerPartyId);
        using var fixture = InstancesControllerFixture.Create(auth);
        Func<Instance?> getInstanceTemplate = SetupSuccessfulCopy(fixture, instance, application);

        // Act
        var controller = fixture.ServiceProvider.GetRequiredService<InstancesController>();
        ActionResult actual = await controller.CopyInstance(
            "ttd",
            "copy-instance",
            instanceOwnerPartyId,
            Guid.Parse(instance.Id.Split("/")[1])
        );

        // Assert
        Assert.IsType<RedirectResult>(actual);
        Instance? instanceTemplate = getInstanceTemplate();
        Assert.NotNull(instanceTemplate);
        Assert.Null(instanceTemplate.DueBefore);
        Assert.Equal(
            new Dictionary<string, string> { [DataValueKeys.CopySourceInstanceId] = instance.Id },
            instanceTemplate.DataValues
        );
        Assert.Null(instanceTemplate.PresentationTexts);
        VerifyNoSeparateDataValuesOrPresentationTextsUpdate(fixture);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task CopyInstance_SourceIsCopy_SourceInstanceIdFollowsIncludedDataValues(bool includeSourceInstanceId)
    {
        // Arrange
        const int instanceOwnerPartyId = 343234;
        string originalInstanceId = $"{instanceOwnerPartyId}/{Guid.NewGuid()}";
        Instance instance = CreateArchivedInstance(instanceOwnerPartyId);
        instance.DataValues = new Dictionary<string, string>
        {
            [DataValueKeys.CopySourceInstanceId] = originalInstanceId,
        };

        ApplicationMetadata application = CreateApplicationMetadata("ttd", "copy-instance", true);
        if (includeSourceInstanceId)
        {
            application.CopyInstanceSettings!.IncludedDataValues = [DataValueKeys.CopySourceInstanceId];
        }

        var auth = TestAuthentication.GetUserAuthentication(userPartyId: instanceOwnerPartyId);
        using var fixture = InstancesControllerFixture.Create(auth);
        Func<Instance?> getInstanceTemplate = SetupSuccessfulCopy(fixture, instance, application);

        // Act
        var controller = fixture.ServiceProvider.GetRequiredService<InstancesController>();
        ActionResult actual = await controller.CopyInstance(
            "ttd",
            "copy-instance",
            instanceOwnerPartyId,
            Guid.Parse(instance.Id.Split("/")[1])
        );

        // Assert
        Assert.IsType<RedirectResult>(actual);
        Instance? instanceTemplate = getInstanceTemplate();
        Assert.NotNull(instanceTemplate);
        // When included, the value copied from the source must win over the id of the source itself,
        // so that a copy of a copy references the first instance in the chain
        Assert.Equal(
            new Dictionary<string, string>
            {
                [DataValueKeys.CopySourceInstanceId] = includeSourceInstanceId ? originalInstanceId : instance.Id,
            },
            instanceTemplate.DataValues
        );
    }

    [Fact]
    public async Task CopyInstance_SourceInstanceIdIncludedButMissingOnSource_SetsSourceInstanceId()
    {
        // Arrange
        const int instanceOwnerPartyId = 343234;
        Instance instance = CreateArchivedInstance(instanceOwnerPartyId);

        ApplicationMetadata application = CreateApplicationMetadata("ttd", "copy-instance", true);
        application.CopyInstanceSettings!.IncludedDataValues = [DataValueKeys.CopySourceInstanceId];

        var auth = TestAuthentication.GetUserAuthentication(userPartyId: instanceOwnerPartyId);
        using var fixture = InstancesControllerFixture.Create(auth);
        Func<Instance?> getInstanceTemplate = SetupSuccessfulCopy(fixture, instance, application);

        // Act
        var controller = fixture.ServiceProvider.GetRequiredService<InstancesController>();
        ActionResult actual = await controller.CopyInstance(
            "ttd",
            "copy-instance",
            instanceOwnerPartyId,
            Guid.Parse(instance.Id.Split("/")[1])
        );

        // Assert
        Assert.IsType<RedirectResult>(actual);
        Instance? instanceTemplate = getInstanceTemplate();
        Assert.NotNull(instanceTemplate);
        Assert.Equal(
            new Dictionary<string, string> { [DataValueKeys.CopySourceInstanceId] = instance.Id },
            instanceTemplate.DataValues
        );
    }

    [Fact]
    public async Task CopyInstance_ProcessorWithOnlyTheMutatorOverload_ChangesTheCopiedForm()
    {
        // Arrange
        const int instanceOwnerPartyId = 343234;
        Instance instance = CreateArchivedInstance(instanceOwnerPartyId);
        ApplicationMetadata application = CreateApplicationMetadata("ttd", "copy-instance", true);
        application.PresentationFields =
        [
            new DataField
            {
                Id = "name",
                Path = "name",
                DataTypeId = "data_type_1",
            },
        ];

        const string name = "Set by DataCreation";
        var auth = TestAuthentication.GetUserAuthentication(userPartyId: instanceOwnerPartyId);
        using var fixture = InstancesControllerFixture.Create(auth);
        SetupSuccessfulCopy(fixture, instance, application);
        fixture
            .Mock<IInstantiationProcessor>()
            .Setup(p => p.DataCreation(It.IsAny<IInstanceDataMutator>(), It.IsAny<object>(), null))
            .Callback<IInstanceDataMutator, object, Dictionary<string, string>?>(
                (_, data, _) => ((CopiedForm)data).Name = name
            )
            .Returns(Task.CompletedTask);

        // Act
        var controller = fixture.ServiceProvider.GetRequiredService<InstancesController>();
        ActionResult actual = await controller.CopyInstance(
            "ttd",
            "copy-instance",
            instanceOwnerPartyId,
            Guid.Parse(instance.Id.Split("/")[1])
        );

        // Assert
        Assert.IsType<RedirectResult>(actual);
        var (request, contentParts) = GetSavedMutation(fixture);
        StorageInstanceMutationCreateDataElement savedForm = Assert.Single(request.CreateDataElements);
        Assert.Contains(
            $"<name>{name}</name>",
            Encoding.UTF8.GetString(contentParts[savedForm.ContentPartName].Bytes.Span)
        );
        Assert.Equal(name, request.PresentationTexts["name"]);
    }

    [Fact]
    public async Task CopyInstance_SeveralForms_SavesThemInOneMutation()
    {
        // Arrange
        const int instanceOwnerPartyId = 343234;
        Instance instance = CreateArchivedInstance(instanceOwnerPartyId);
        instance.Data.Add(new DataElement { Id = Guid.NewGuid().ToString(), DataType = "data_type_1" });
        ApplicationMetadata application = CreateApplicationMetadata("ttd", "copy-instance", true);

        var auth = TestAuthentication.GetUserAuthentication(userPartyId: instanceOwnerPartyId);
        using var fixture = InstancesControllerFixture.Create(auth);
        SetupSuccessfulCopy(fixture, instance, application);

        // Act
        var controller = fixture.ServiceProvider.GetRequiredService<InstancesController>();
        ActionResult actual = await controller.CopyInstance(
            "ttd",
            "copy-instance",
            instanceOwnerPartyId,
            Guid.Parse(instance.Id.Split("/")[1])
        );

        // Assert
        Assert.IsType<RedirectResult>(actual);
        var (request, _) = GetSavedMutation(fixture);
        Assert.Equal(2, request.CreateDataElements.Count);
    }

    [Fact]
    public async Task CopyInstance_WithAttachments_DataCreationSeesTheCopiedAttachment()
    {
        // Arrange
        const int instanceOwnerPartyId = 343234;
        Instance instance = CreateArchivedInstance(instanceOwnerPartyId);
        DataElement attachment = new()
        {
            Id = Guid.NewGuid().ToString(),
            DataType = "attachment",
            ContentType = "application/pdf",
            Filename = "test.pdf",
        };
        instance.Data.Add(attachment);
        ApplicationMetadata application = CreateApplicationMetadata("ttd", "copy-instance", true);
        application.CopyInstanceSettings.IncludeAttachments = true;

        var auth = TestAuthentication.GetUserAuthentication(userPartyId: instanceOwnerPartyId);
        using var fixture = InstancesControllerFixture.Create(auth);
        SetupSuccessfulCopy(fixture, instance, application);
        List<string> dataElementIdsSeen = [];
        fixture
            .Mock<IInstantiationProcessor>()
            .Setup(p => p.DataCreation(It.IsAny<IInstanceDataMutator>(), It.IsAny<object>(), null))
            .Callback<IInstanceDataMutator, object, Dictionary<string, string>?>(
                (mutator, _, _) =>
                    dataElementIdsSeen.AddRange(mutator.Instance.Data.Select(dataElement => dataElement.Id))
            )
            .Returns(Task.CompletedTask);

        DataElement copiedAttachment = new() { Id = Guid.NewGuid().ToString(), DataType = "attachment" };
        List<DataElement> copiedAttachments = [];
        fixture
            .Mock<IDataClient>()
            .Setup(p =>
                p.GetBinaryData(
                    It.IsAny<int>(),
                    It.IsAny<Guid>(),
                    Guid.Parse(attachment.Id),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(() => new MemoryStream(Encoding.UTF8.GetBytes("Binary content")));
        fixture
            .Mock<IDataClient>()
            .Setup(p =>
                p.InsertBinaryData(
                    instance.Id,
                    "attachment",
                    "application/pdf",
                    "test.pdf",
                    It.IsAny<Stream>(),
                    It.IsAny<string>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback(() => copiedAttachments.Add(copiedAttachment))
            .ReturnsAsync(copiedAttachment);
        fixture
            .Mock<IInstanceClientWithStorageMetadata>()
            .Setup(i =>
                i.GetInstanceWithStorageMetadata(
                    It.IsAny<Instance>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(() =>
                new InstanceWithStorageMetadata(
                    new Instance
                    {
                        Id = instance.Id,
                        AppId = instance.AppId,
                        InstanceOwner = instance.InstanceOwner,
                        Status = instance.Status,
                        Process = instance.Process,
                        Data = [.. copiedAttachments],
                    },
                    TargetVersions
                )
            );

        // Act
        var controller = fixture.ServiceProvider.GetRequiredService<InstancesController>();
        ActionResult actual = await controller.CopyInstance(
            "ttd",
            "copy-instance",
            instanceOwnerPartyId,
            Guid.Parse(instance.Id.Split("/")[1])
        );

        // Assert
        Assert.IsType<RedirectResult>(actual);
        Assert.Contains(copiedAttachment.Id, dataElementIdsSeen);
    }

    private static void VerifyNoSeparateDataValuesOrPresentationTextsUpdate(InstancesControllerFixture fixture)
    {
        fixture
            .Mock<IInstanceClient>()
            .Verify(
                i =>
                    i.UpdateDataValues(
                        It.IsAny<int>(),
                        It.IsAny<Guid>(),
                        It.IsAny<DataValues>(),
                        It.IsAny<StorageAuthenticationMethod?>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Never
            );
        fixture
            .Mock<IInstanceClient>()
            .Verify(
                i =>
                    i.UpdatePresentationTexts(
                        It.IsAny<int>(),
                        It.IsAny<Guid>(),
                        It.IsAny<PresentationTexts>(),
                        It.IsAny<StorageAuthenticationMethod?>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Never
            );
    }

    private static Instance CreateArchivedInstance(int instanceOwnerPartyId)
    {
        return new Instance
        {
            Id = $"{instanceOwnerPartyId}/{Guid.NewGuid()}",
            AppId = "ttd/copy-instance",
            InstanceOwner = new InstanceOwner { PartyId = instanceOwnerPartyId.ToString() },
            Status = new InstanceStatus { IsArchived = true },
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "First" } },
            Data = [new DataElement { Id = Guid.NewGuid().ToString(), DataType = "data_type_1" }],
        };
    }

    /// <summary>
    /// Sets up the mocks needed for a successful copy of <paramref name="instance"/> where the created instance
    /// is the same as the source. The returned function gives the template passed to
    /// <see cref="IInstanceClient.CreateInstance(string, string, Instance, StorageAuthenticationMethod?, CancellationToken)"/>.
    /// </summary>
    private static Func<Instance?> SetupSuccessfulCopy(
        InstancesControllerFixture fixture,
        Instance instance,
        ApplicationMetadata application
    )
    {
        int instanceOwnerPartyId = int.Parse(instance.InstanceOwner.PartyId);
        Instance? instanceTemplate = null;

        fixture
            .Mock<HttpContext>()
            .Setup(httpContext => httpContext.User)
            .Returns(TestAuthentication.GetUserPrincipal(partyId: instanceOwnerPartyId));
        fixture.Mock<HttpContext>().Setup(hc => hc.Request).Returns(Mock.Of<HttpRequest>());
        fixture.Mock<IAppMetadata>().Setup(a => a.ApplicationMetadata).Returns(application);
        fixture
            .Mock<IPDP>()
            .Setup<Task<XacmlJsonResponse>>(p =>
                p.GetDecisionForRequest(It.IsAny<XacmlJsonRequestRoot>(), It.IsAny<CancellationToken>())
            )
            .ReturnsAsync(CreateXacmlResponse("Permit"));
        fixture
            .Mock<IInstanceClientWithStorageMetadata>()
            .Setup(i =>
                i.GetInstanceWithStorageMetadata(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<int>(),
                    It.IsAny<Guid>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new InstanceWithStorageMetadata(instance, SourceVersions));
        fixture
            .Mock<IInstanceClient>()
            .Setup(i =>
                i.CreateInstance(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<Instance>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback<string, string, Instance, StorageAuthenticationMethod?, CancellationToken>(
                (_, _, template, _, _) => instanceTemplate = template
            )
            .ReturnsAsync(instance);
        fixture
            .Mock<IInstanceClientWithStorageMetadata>()
            .Setup(i =>
                i.GetInstanceWithStorageMetadata(
                    It.IsAny<Instance>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new InstanceWithStorageMetadata(instance, TargetVersions));
        fixture
            .Mock<IInstantiationValidator>()
            .Setup(v => v.Validate(It.IsAny<Instance>()))
            .ReturnsAsync(new InstantiationValidationResult { Valid = true });
        fixture
            .Mock<ICopyInstanceValidator>()
            .Setup(v => v.Validate(It.IsAny<IInstanceDataAccessor>()))
            .ReturnsAsync(new InstantiationValidationResult { Valid = true });
        fixture
            .Mock<IProcessEngine>()
            .Setup(p => p.CreateInitialProcessState(It.IsAny<ProcessStartRequest>()))
            .ReturnsAsync(
                new ProcessChangeResult
                {
                    Success = true,
                    ProcessStateChange = new ProcessStateChange { Events = [] },
                }
            );
        fixture
            .Mock<IProcessEngine>()
            .Setup(p =>
                p.SubmitInitialProcessState(
                    It.IsAny<Instance>(),
                    It.IsAny<StorageVersionMetadata>(),
                    It.IsAny<ProcessStateChange>(),
                    It.IsAny<bool>(),
                    It.IsAny<Dictionary<string, string>?>(),
                    It.IsAny<InstantiationNotification?>(),
                    It.IsAny<string?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(instance);
        fixture
            .Mock<IDataClient>()
            .Setup(p =>
                p.GetFormData(
                    It.IsAny<Instance>(),
                    It.IsAny<DataElement>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(() => new CopiedForm());
        SetupFormDataSave(fixture, instance);

        return () => instanceTemplate;
    }

    /// <summary>
    /// Sets up Storage's response to the save of the copied form data on <paramref name="targetInstance"/>.
    /// </summary>
    private static void SetupFormDataSave(InstancesControllerFixture fixture, Instance targetInstance)
    {
        fixture.Mock<IAppModel>().Setup(m => m.GetModelType(CopiedFormClassRef)).Returns(typeof(CopiedForm));
        fixture.Mock<IAppModel>().Setup(m => m.Create(CopiedFormClassRef)).Returns(() => new CopiedForm());
        fixture
            .Mock<IInstanceMutationClient>()
            .Setup(c =>
                c.CommitInstanceMutationWithStorageMetadata(
                    It.IsAny<int>(),
                    It.IsAny<Guid>(),
                    It.IsAny<StorageInstanceMutationRequest>(),
                    It.IsAny<IReadOnlyDictionary<string, StorageInstanceMutationContent>>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<StorageWritePreconditions?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                (
                    int _,
                    Guid _,
                    StorageInstanceMutationRequest request,
                    IReadOnlyDictionary<string, StorageInstanceMutationContent> _,
                    StorageAuthenticationMethod? _,
                    StorageWritePreconditions? _,
                    CancellationToken _
                ) =>
                {
                    List<DataElement> created = request
                        .CreateDataElements.Select(create => new DataElement
                        {
                            Id = Guid.NewGuid().ToString(),
                            DataType = create.DataType,
                            ContentType = create.ContentType,
                        })
                        .ToList();
                    Instance saved = new()
                    {
                        Id = targetInstance.Id,
                        AppId = targetInstance.AppId,
                        Org = targetInstance.Org,
                        InstanceOwner = targetInstance.InstanceOwner,
                        Status = targetInstance.Status,
                        Process = targetInstance.Process,
                        Data = [.. targetInstance.Data, .. created],
                    };
                    return new InstanceMutationWithStorageMetadata(
                        saved,
                        TargetVersions,
                        created.Select(dataElement => Guid.Parse(dataElement.Id)).ToList()
                    );
                }
            );
    }

    private static (
        StorageInstanceMutationRequest Request,
        IReadOnlyDictionary<string, StorageInstanceMutationContent> ContentParts
    ) GetSavedMutation(InstancesControllerFixture fixture)
    {
        IInvocation save = Assert.Single(
            fixture.Mock<IInstanceMutationClient>().Invocations,
            invocation =>
                invocation.Method.Name == nameof(IInstanceMutationClient.CommitInstanceMutationWithStorageMetadata)
        );
        return (
            (StorageInstanceMutationRequest)save.Arguments[2],
            (IReadOnlyDictionary<string, StorageInstanceMutationContent>)save.Arguments[3]
        );
    }

    public sealed class CopiedForm
    {
        [XmlElement("name")]
        [JsonPropertyName("name")]
        public string? Name { get; set; }
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
                    AppLogic = new ApplicationLogic { ClassRef = CopiedFormClassRef },
                    TaskIds = ["First"],
                },
                // Binary data types (no AppLogic.ClassRef)
                new DataType
                {
                    Id = "attachment",
                    TaskIds = ["First"],
                    MaxSize = 25 * 1024 * 1024,
                    MaxCount = 10,
                },
                new DataType
                {
                    Id = "sensitive-attachment",
                    TaskIds = ["First"],
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
