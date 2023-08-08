using System.Net;
using Altinn.App.Api.Controllers;
using Altinn.App.Core.Features.Validation;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace Altinn.App.Api.Tests.Controllers;

public class ValidateControllerTests
{
    [Fact]
    public async Task ValidateInstance_returns_NotFound_when_GetInstance_returns_null()
    {
        // Arrange
        var instanceMock = new Mock<IInstanceClient>();
        var appMetadataMock = new Mock<IAppMetadata>();
        var validationMock = new Mock<IValidation>();

        const string org = "ttd";
        const string app = "app";
        const int instanceOwnerPartyId = 1337;
        Guid instanceId = new Guid();
        instanceMock.Setup(i => i.GetInstance(app, org, instanceOwnerPartyId, instanceId))
            .Returns(Task.FromResult<Instance>(null!));

        // Act
        var validateController =
            new ValidateController(instanceMock.Object, validationMock.Object, appMetadataMock.Object);
        var result = await validateController.ValidateInstance(org, app, instanceOwnerPartyId, instanceId);

        // Assert
        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task ValidateInstance_throws_ValidationException_when_Instance_Process_is_null()
    {
        // Arrange
        var instanceMock = new Mock<IInstanceClient>();
        var appMetadataMock = new Mock<IAppMetadata>();
        var validationMock = new Mock<IValidation>();

        const string org = "ttd";
        const string app = "app";
        const int instanceOwnerPartyId = 1337;
        var instanceId = Guid.NewGuid();

        Instance instance = new Instance
        {
            Id = "instanceId",
            Process = null
        };

        instanceMock.Setup(i => i.GetInstance(app, org, instanceOwnerPartyId, instanceId))
            .Returns(Task.FromResult<Instance>(instance));

        // Act
        var validateController =
            new ValidateController(instanceMock.Object, validationMock.Object, appMetadataMock.Object);

        // Assert
        var exception = await Assert.ThrowsAsync<ValidationException>(() =>
            validateController.ValidateInstance(org, app, instanceOwnerPartyId, instanceId));
        Assert.Equal("Unable to validate instance without a started process.", exception.Message);
    }

    [Fact]
    public async Task ValidateInstance_throws_ValidationException_when_Instance_Process_CurrentTask_is_null()
    {
        // Arrange
        var instanceMock = new Mock<IInstanceClient>();
        var appMetadataMock = new Mock<IAppMetadata>();
        var validationMock = new Mock<IValidation>();

        const string org = "ttd";
        const string app = "app";
        const int instanceOwnerPartyId = 1337;
        var instanceId = Guid.NewGuid();

        Instance instance = new Instance
        {
            Id = "instanceId",
            Process = new ProcessState
            {
                CurrentTask = null
            }
        };

        instanceMock.Setup(i => i.GetInstance(app, org, instanceOwnerPartyId, instanceId))
            .Returns(Task.FromResult<Instance>(instance));

        // Act
        var validateController =
            new ValidateController(instanceMock.Object, validationMock.Object, appMetadataMock.Object);

        // Assert
        var exception = await Assert.ThrowsAsync<ValidationException>(() =>
            validateController.ValidateInstance(org, app, instanceOwnerPartyId, instanceId));
        Assert.Equal("Unable to validate instance without a started process.", exception.Message);
    }

    [Fact]
    public async Task ValidateInstance_returns_OK_with_messages()
    {
        // Arrange
        var instanceMock = new Mock<IInstanceClient>();
        var appMetadataMock = new Mock<IAppMetadata>();
        var validationMock = new Mock<IValidation>();

        const string org = "ttd";
        const string app = "app";
        const int instanceOwnerPartyId = 1337;
        var instanceId = Guid.NewGuid();

        Instance instance = new Instance
        {
            Id = "instanceId",
            Process = new ProcessState
            {
                CurrentTask = new ProcessElementInfo
                {
                    ElementId = "dummy"
                }
            }
        };

        var validationResult = new List<ValidationIssue>
        {
            new ValidationIssue
            {
                Field = "dummy",
                Severity = ValidationIssueSeverity.Fixed
            }
        };

        instanceMock.Setup(i => i.GetInstance(app, org, instanceOwnerPartyId, instanceId))
            .Returns(Task.FromResult<Instance>(instance));

        validationMock.Setup(v => v.ValidateAndUpdateProcess(instance, "dummy"))
            .Returns(Task.FromResult(validationResult));

        // Act
        var validateController =
            new ValidateController(instanceMock.Object, validationMock.Object, appMetadataMock.Object);
        var result = await validateController.ValidateInstance(org, app, instanceOwnerPartyId, instanceId);

        // Assert
        result.Should().BeOfType<OkObjectResult>().Which.Value.Should().BeEquivalentTo(validationResult);
    }

    [Fact]
    public async Task ValidateInstance_returns_403_when_not_authorized()
    {
        // Arrange
        var instanceMock = new Mock<IInstanceClient>();
        var appMetadataMock = new Mock<IAppMetadata>();
        var validationMock = new Mock<IValidation>();

        const string org = "ttd";
        const string app = "app";
        const int instanceOwnerPartyId = 1337;
        var instanceId = Guid.NewGuid();

        Instance instance = new Instance
        {
            Id = "instanceId",
            Process = new ProcessState
            {
                CurrentTask = new ProcessElementInfo
                {
                    ElementId = "dummy"
                }
            }
        };

        var updateProcessResult = new HttpResponseMessage(HttpStatusCode.Forbidden);
        PlatformHttpException exception = await PlatformHttpException.CreateAsync(updateProcessResult);

        instanceMock.Setup(i => i.GetInstance(app, org, instanceOwnerPartyId, instanceId))
            .Returns(Task.FromResult<Instance>(instance));

        validationMock.Setup(v => v.ValidateAndUpdateProcess(instance, "dummy"))
            .Throws(exception);

        // Act
        var validateController =
            new ValidateController(instanceMock.Object, validationMock.Object, appMetadataMock.Object);
        var result = await validateController.ValidateInstance(org, app, instanceOwnerPartyId, instanceId);

        // Assert
        result.Should().BeOfType<StatusCodeResult>().Which.StatusCode.Should().Be(403);
    }

    [Fact]
    public async Task ValidateInstance_throws_PlatformHttpException_when_not_403()
    {
        // Arrange
        var instanceMock = new Mock<IInstanceClient>();
        var appMetadataMock = new Mock<IAppMetadata>();
        var validationMock = new Mock<IValidation>();

        const string org = "ttd";
        const string app = "app";
        const int instanceOwnerPartyId = 1337;
        var instanceId = Guid.NewGuid();

        Instance instance = new Instance
        {
            Id = "instanceId",
            Process = new ProcessState
            {
                CurrentTask = new ProcessElementInfo
                {
                    ElementId = "dummy"
                }
            }
        };

        var updateProcessResult = new HttpResponseMessage(HttpStatusCode.BadRequest);
        PlatformHttpException exception = await PlatformHttpException.CreateAsync(updateProcessResult);

        instanceMock.Setup(i => i.GetInstance(app, org, instanceOwnerPartyId, instanceId))
            .Returns(Task.FromResult<Instance>(instance));

        validationMock.Setup(v => v.ValidateAndUpdateProcess(instance, "dummy"))
            .Throws(exception);

        // Act
        var validateController =
            new ValidateController(instanceMock.Object, validationMock.Object, appMetadataMock.Object);

        // Assert
        var thrownException = await Assert.ThrowsAsync<PlatformHttpException>(() =>
            validateController.ValidateInstance(org, app, instanceOwnerPartyId, instanceId));
        Assert.Equal(exception, thrownException);
    }

}
