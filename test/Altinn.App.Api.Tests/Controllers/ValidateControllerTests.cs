using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.App.Api.Controllers;
using Altinn.App.Services.Interface;
using Altinn.App.Services.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.VisualStudio.TestPlatform.CommunicationUtilities;
using Moq;
using Xunit;

namespace Altinn.App.Api.Tests.Controllers;

public class ValidateControllerTests
{
    [Fact]
    public async Task ValidateInstance_returns_NotFound_when_GetInstance_returns_null()
    {
        // Arrange
        var instanceMock = new Mock<IInstance>();
        var appResourceMock = new Mock<IAppResources>();
        var validationMock = new Mock<IValidation>();

        const string org = "ttd";
        const string app = "app";
        const int instanceOwnerPartyId = 1337;
        Guid instanceId = new Guid();
        instanceMock.Setup(i => i.GetInstance(app, org, instanceOwnerPartyId, instanceId))
            .Returns(Task.FromResult<Instance>(null));

        // Act
        var validateController =
            new ValidateController(instanceMock.Object, validationMock.Object, appResourceMock.Object);
        var result = await validateController.ValidateInstance(org, app, instanceOwnerPartyId, instanceId);

        // Assert
        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task ValidateInstance_throws_ValidationException_when_Instance_Process_is_null()
    {
        // Arrange
        var instanceMock = new Mock<IInstance>();
        var appResourceMock = new Mock<IAppResources>();
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
            new ValidateController(instanceMock.Object, validationMock.Object, appResourceMock.Object);

        // Assert
        var exception = await Assert.ThrowsAsync<ValidationException>(() =>
            validateController.ValidateInstance(org, app, instanceOwnerPartyId, instanceId));
        Assert.Equal("Unable to validate instance without a started process.", exception.Message);
    }

    [Fact]
    public async Task ValidateInstance_throws_ValidationException_when_Instance_Process_CurrentTask_is_null()
    {
        // Arrange
        var instanceMock = new Mock<IInstance>();
        var appResourceMock = new Mock<IAppResources>();
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
            new ValidateController(instanceMock.Object, validationMock.Object, appResourceMock.Object);

        // Assert
        var exception = await Assert.ThrowsAsync<ValidationException>(() =>
            validateController.ValidateInstance(org, app, instanceOwnerPartyId, instanceId));
        Assert.Equal("Unable to validate instance without a started process.", exception.Message);
    }

    [Fact]
    public async Task ValidateInstance_returns_OK_with_messages()
    {
        // Arrange
        var instanceMock = new Mock<IInstance>();
        var appResourceMock = new Mock<IAppResources>();
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
            new ValidateController(instanceMock.Object, validationMock.Object, appResourceMock.Object);
        var result = await validateController.ValidateInstance(org, app, instanceOwnerPartyId, instanceId);

        // Assert
        Assert.IsType<OkObjectResult>(result);
        var okResult = result as OkObjectResult;
        okResult.Value.Should().BeEquivalentTo(validationResult);
    }
}