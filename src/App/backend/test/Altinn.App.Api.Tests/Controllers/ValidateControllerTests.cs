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
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Internal.Validation;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
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

    private readonly Mock<IInstanceClient> _instanceClientMock = new(MockBehavior.Strict);
    private readonly Mock<IAppMetadata> _appMetadataMock = new(MockBehavior.Strict);
    private readonly Mock<IValidationService> _validationServiceMock = new(MockBehavior.Strict);
    private readonly Mock<IDataClient> _dataClientMock = new(MockBehavior.Strict);
    private readonly Mock<IAppModel> _appModelMock = new(MockBehavior.Strict);
    private readonly Mock<ITranslationService> _translationServiceMock = new(MockBehavior.Strict);
    private readonly Mock<IAppResources> _appResourcesMock = new(MockBehavior.Strict);
    private readonly ServiceCollection _services = new();

    public ValidateControllerTests()
    {
        _appMetadataMock
            .Setup(a => a.GetApplicationMetadata())
            .ReturnsAsync(new ApplicationMetadata($"{Org}/{App}") { DataTypes = [] });

        _services.AddSingleton(_instanceClientMock.Object);
        _services.AddSingleton(_appMetadataMock.Object);
        _services.AddSingleton(_validationServiceMock.Object);
        _services.AddSingleton(_dataClientMock.Object);
        _services.AddSingleton(_appModelMock.Object);
        _services.AddSingleton(_translationServiceMock.Object);
        _services.AddSingleton(_appResourcesMock.Object);
        _services.AddSingleton(Options.Create(new FrontEndSettings()));
        _services.AddTransient<InstanceDataUnitOfWorkInitializer>();
        _services.AddTransient<ModelSerializationService>();
        _services.AddTransient<ValidateController>();
    }

    [Fact]
    public async Task ValidateInstance_returns_409_when_Instance_Process_is_null()
    {
        // Arrange
        Instance instance = new Instance { Id = "instanceId", Process = null };

        _instanceClientMock
            .Setup(i =>
                i.GetInstance(
                    App,
                    Org,
                    InstanceOwnerPartyId,
                    _instanceId,
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(instance);

        await using var sp = _services.BuildStrictServiceProvider();
        var validateController = sp.GetRequiredService<ValidateController>();

        // Act
        var result = await validateController.ValidateInstance(Org, App, InstanceOwnerPartyId, _instanceId);

        // Assert
        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(409, objectResult.StatusCode);
        var problemDetails = Assert.IsType<ProblemDetails>(objectResult.Value);
        Assert.Equal(409, problemDetails.Status);
        Assert.Equal("Validation error", problemDetails.Title);
        Assert.Equal("Unable to validate instance without a started process.", problemDetails.Detail);
    }

    [Fact]
    public async Task ValidateInstance_returns_409_when_Instance_Process_CurrentTask_is_null()
    {
        // Arrange
        Instance instance = new Instance
        {
            Id = "instanceId",
            Process = new ProcessState { CurrentTask = null },
        };

        _instanceClientMock
            .Setup(i =>
                i.GetInstance(
                    App,
                    Org,
                    InstanceOwnerPartyId,
                    _instanceId,
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(instance);

        await using var sp = _services.BuildStrictServiceProvider();
        var validateController = sp.GetRequiredService<ValidateController>();

        // Act
        var result = await validateController.ValidateInstance(Org, App, InstanceOwnerPartyId, _instanceId);

        // Assert
        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(409, objectResult.StatusCode);
        var problemDetails = Assert.IsType<ProblemDetails>(objectResult.Value);
        Assert.Equal(409, problemDetails.Status);
        Assert.Equal("Validation error", problemDetails.Title);
        Assert.Equal("Unable to validate instance without a started process.", problemDetails.Detail);
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

        _instanceClientMock
            .Setup(i =>
                i.GetInstance(
                    App,
                    Org,
                    InstanceOwnerPartyId,
                    _instanceId,
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(instance);

        _validationServiceMock
            .Setup(v => v.ValidateInstanceAtTask(It.IsAny<IInstanceDataAccessor>(), "dummy", null, null, null))
            .ReturnsAsync(validationResult);

        await using var sp = _services.BuildStrictServiceProvider();
        var validateController = sp.GetRequiredService<ValidateController>();

        // Act
        var result = await validateController.ValidateInstance(Org, App, InstanceOwnerPartyId, _instanceId);

        // Assert
        var okObjectResult = Assert.IsType<OkObjectResult>(result);
        var actual = Assert.IsType<List<ValidationIssueWithSource>>(okObjectResult.Value);
        Assert.Equal(validationResult, actual);
    }

    [Fact]
    public async Task ValidateInstance_forwards_trimmed_ignoredValidators_to_validation_service()
    {
        // Arrange
        var instance = new Instance
        {
            Id = $"{InstanceOwnerPartyId}/{_instanceId}",
            InstanceOwner = new() { PartyId = InstanceOwnerPartyId.ToString() },
            Org = Org,
            AppId = $"{Org}/{App}",
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "dummy" } },
        };
        _instanceClientMock
            .Setup(i =>
                i.GetInstance(
                    App,
                    Org,
                    InstanceOwnerPartyId,
                    _instanceId,
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(instance);

        List<ValidationIssueWithSource> empty = [];
        _validationServiceMock
            .Setup(v =>
                v.ValidateInstanceAtTask(
                    It.IsAny<IInstanceDataAccessor>(),
                    It.IsAny<string>(),
                    It.IsAny<List<string>?>(),
                    null,
                    null
                )
            )
            .ReturnsAsync(empty);

        await using var sp = _services.BuildStrictServiceProvider();
        var controller = sp.GetRequiredService<ValidateController>();

        // Act
        var result = await controller.ValidateInstance(
            Org,
            App,
            InstanceOwnerPartyId,
            _instanceId,
            ignoredValidators: " A ,  B  , "
        );

        // Assert
        Assert.IsType<OkObjectResult>(result);
        _validationServiceMock.Verify(
            v =>
                v.ValidateInstanceAtTask(
                    It.IsAny<IInstanceDataAccessor>(),
                    "dummy",
                    It.Is<List<string>?>(lst => lst != null && lst.SequenceEqual(new[] { "A", "B" })),
                    null,
                    null
                ),
            Times.Once()
        );
    }

    [Fact]
    public async Task ValidateInstance_returns_status_code_from_PlatformHttpException_when_thrown()
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

        _instanceClientMock
            .Setup(i =>
                i.GetInstance(
                    App,
                    Org,
                    InstanceOwnerPartyId,
                    _instanceId,
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(instance);

        _validationServiceMock
            .Setup(v => v.ValidateInstanceAtTask(It.IsAny<IInstanceDataAccessor>(), "dummy", null, null, null))
            .Throws(exception);

        await using var sp = _services.BuildStrictServiceProvider();
        var validateController = sp.GetRequiredService<ValidateController>();

        // Act
        var result = await validateController.ValidateInstance(Org, App, InstanceOwnerPartyId, _instanceId);

        // Assert
        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(403, objectResult.StatusCode);
        var problemDetails = Assert.IsType<ProblemDetails>(objectResult.Value);
        Assert.Equal(403, problemDetails.Status);
        Assert.Equal("Something went wrong.", problemDetails.Title);
        Assert.Equal(exception.Message, problemDetails?.Detail);
    }
}
