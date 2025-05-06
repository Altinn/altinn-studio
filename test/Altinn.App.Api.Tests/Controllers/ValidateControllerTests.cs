using System.Net;
using Altinn.App.Api.Controllers;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Validation;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Moq;

namespace Altinn.App.Api.Tests.Controllers;

public class ValidateControllerTests
{
    private const string Org = "ttd";
    private const string App = "app";
    private const int InstanceOwnerPartyId = 1337;
    private static readonly Guid _instanceId = Guid.NewGuid();

    private readonly Mock<IInstanceClient> _instanceMock = new(MockBehavior.Strict);
    private readonly Mock<IAppMetadata> _appMetadataMock = new(MockBehavior.Strict);
    private readonly Mock<IValidationService> _validationMock = new(MockBehavior.Strict);
    private readonly Mock<IDataClient> _dataClientMock = new(MockBehavior.Strict);
    private readonly Mock<IAppModel> _appModelMock = new(MockBehavior.Strict);
    private readonly Mock<IAppResources> _appResourcesMock = new(MockBehavior.Strict);
    private readonly ServiceCollection _services = new();

    public ValidateControllerTests()
    {
        _appMetadataMock
            .Setup(a => a.GetApplicationMetadata())
            .ReturnsAsync(new ApplicationMetadata($"{Org}/{App}") { DataTypes = [] });

        _services.AddSingleton(_instanceMock.Object);
        _services.AddSingleton(_appMetadataMock.Object);
        _services.AddSingleton(_validationMock.Object);
        _services.AddSingleton(_dataClientMock.Object);
        _services.AddSingleton(_appModelMock.Object);
        _services.AddSingleton(_appResourcesMock.Object);
        _services.AddSingleton(Options.Create(new FrontEndSettings()));
        _services.AddTransient<InstanceDataUnitOfWorkInitializer>();
        _services.AddTransient<ModelSerializationService>();
        _services.AddTransient<ValidateController>();
    }

    [Fact]
    public async Task ValidateInstance_returns_NotFound_when_GetInstance_returns_null()
    {
        // Arrange
        _instanceMock
            .Setup(i => i.GetInstance(App, Org, InstanceOwnerPartyId, _instanceId))
            .Returns(Task.FromResult<Instance>(null!));

        // Act
        await using var sp = _services.BuildStrictServiceProvider();
        var validateController = sp.GetRequiredService<ValidateController>();
        var result = await validateController.ValidateInstance(Org, App, InstanceOwnerPartyId, _instanceId);

        // Assert
        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task ValidateInstance_throws_ValidationException_when_Instance_Process_is_null()
    {
        // Arrange

        Instance instance = new Instance { Id = "instanceId", Process = null };

        _instanceMock
            .Setup(i => i.GetInstance(App, Org, InstanceOwnerPartyId, _instanceId))
            .Returns(Task.FromResult<Instance>(instance));

        // Act
        await using var sp = _services.BuildStrictServiceProvider();
        var validateController = sp.GetRequiredService<ValidateController>();

        // Assert
        var exception = await Assert.ThrowsAsync<ValidationException>(() =>
            validateController.ValidateInstance(Org, App, InstanceOwnerPartyId, _instanceId)
        );
        Assert.Equal("Unable to validate instance without a started process.", exception.Message);
    }

    [Fact]
    public async Task ValidateInstance_throws_ValidationException_when_Instance_Process_CurrentTask_is_null()
    {
        // Arrange
        Instance instance = new Instance
        {
            Id = "instanceId",
            Process = new ProcessState { CurrentTask = null },
        };

        _instanceMock
            .Setup(i => i.GetInstance(App, Org, InstanceOwnerPartyId, _instanceId))
            .Returns(Task.FromResult<Instance>(instance));

        // Act
        await using var sp = _services.BuildStrictServiceProvider();
        var validateController = sp.GetRequiredService<ValidateController>();

        // Assert
        var exception = await Assert.ThrowsAsync<ValidationException>(() =>
            validateController.ValidateInstance(Org, App, InstanceOwnerPartyId, _instanceId)
        );
        Assert.Equal("Unable to validate instance without a started process.", exception.Message);
    }

    [Fact]
    public async Task ValidateInstance_returns_OK_with_messages()
    {
        // Arrange

        Instance instance = new Instance
        {
            Id = $"{InstanceOwnerPartyId}/{_instanceId}",
            InstanceOwner = new() { PartyId = InstanceOwnerPartyId.ToString() },
            Org = Org,
            AppId = $"{Org}/{App}",

            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "dummy" } },
        };

        var validationResult = new List<ValidationIssueWithSource>()
        {
            new()
            {
                Code = "dummy",
                Description = "dummy",
                Field = "dummy",
                Severity = ValidationIssueSeverity.Fixed,
                Source = "dummy",
                NoIncrementalUpdates = true,
            },
        };

        _instanceMock
            .Setup(i => i.GetInstance(App, Org, InstanceOwnerPartyId, _instanceId))
            .Returns(Task.FromResult<Instance>(instance));

        _validationMock
            .Setup(v => v.ValidateInstanceAtTask(It.IsAny<IInstanceDataAccessor>(), "dummy", null, null, null))
            .ReturnsAsync(validationResult);

        // Act
        await using var sp = _services.BuildStrictServiceProvider();
        var validateController = sp.GetRequiredService<ValidateController>();
        var result = await validateController.ValidateInstance(Org, App, InstanceOwnerPartyId, _instanceId);

        // Assert
        result.Should().BeOfType<OkObjectResult>().Which.Value.Should().BeEquivalentTo(validationResult);
    }

    [Fact]
    public async Task ValidateInstance_returns_403_when_not_authorized()
    {
        // Arrange
        Instance instance = new Instance
        {
            Id = $"{InstanceOwnerPartyId}/{_instanceId}",
            InstanceOwner = new() { PartyId = InstanceOwnerPartyId.ToString() },
            Org = Org,
            AppId = $"{Org}/{App}",
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "dummy" } },
        };

        var updateProcessResult = new HttpResponseMessage(HttpStatusCode.Forbidden);
        PlatformHttpException exception = await PlatformHttpException.CreateAsync(updateProcessResult);

        _instanceMock
            .Setup(i => i.GetInstance(App, Org, InstanceOwnerPartyId, _instanceId))
            .Returns(Task.FromResult<Instance>(instance));

        _validationMock
            .Setup(v => v.ValidateInstanceAtTask(It.IsAny<IInstanceDataAccessor>(), "dummy", null, null, null))
            .Throws(exception);

        // Act
        await using var sp = _services.BuildStrictServiceProvider();
        var validateController = sp.GetRequiredService<ValidateController>();
        var result = await validateController.ValidateInstance(Org, App, InstanceOwnerPartyId, _instanceId);

        // Assert
        result.Should().BeOfType<StatusCodeResult>().Which.StatusCode.Should().Be(403);
    }

    [Fact]
    public async Task ValidateInstance_throws_PlatformHttpException_when_not_403()
    {
        // Arrange
        Instance instance = new Instance
        {
            Id = $"{InstanceOwnerPartyId}/{_instanceId}",
            InstanceOwner = new() { PartyId = InstanceOwnerPartyId.ToString() },
            Org = Org,
            AppId = $"{Org}/{App}",
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "dummy" } },
        };

        var updateProcessResult = new HttpResponseMessage(HttpStatusCode.BadRequest);
        PlatformHttpException exception = await PlatformHttpException.CreateAsync(updateProcessResult);

        _instanceMock
            .Setup(i => i.GetInstance(App, Org, InstanceOwnerPartyId, _instanceId))
            .Returns(Task.FromResult<Instance>(instance));

        _validationMock
            .Setup(v => v.ValidateInstanceAtTask(It.IsAny<IInstanceDataAccessor>(), "dummy", null, null, null))
            .Throws(exception);

        // Act
        await using var sp = _services.BuildStrictServiceProvider();
        var validateController = sp.GetRequiredService<ValidateController>();

        // Assert
        var thrownException = await Assert.ThrowsAsync<PlatformHttpException>(() =>
            validateController.ValidateInstance(Org, App, InstanceOwnerPartyId, _instanceId)
        );
        Assert.Equal(exception, thrownException);
    }
}
