using System.ComponentModel.DataAnnotations;
using System.Net;
using Altinn.App.Api.Helpers.Patch;
using Altinn.App.Api.Models;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
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
using FluentAssertions;
using Json.Patch;
using Json.Pointer;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using DataType = Altinn.Platform.Storage.Interface.Models.DataType;

namespace Altinn.App.Core.Tests.Internal.Patch;

public sealed class PatchServiceTests : IDisposable
{
    // Test data
    private static readonly Guid _dataGuid = new("12345678-1234-1234-1234-123456789123");

    private readonly Instance _instance = new()
    {
        Id = "1337/12345678-1234-1234-1234-12345678912a",
        AppId = "ttd/test",
        Org = "ttd",
        InstanceOwner = new() { PartyId = "1337" },
        Data = [_dataElement],
        Process = new() { CurrentTask = new() { ElementId = "Task_1" } },
    };

    // Service mocks
    private readonly Mock<ILogger<ValidationService>> _vLoggerMock = new(MockBehavior.Loose);
    private readonly Mock<ITranslationService> _translationService = new(MockBehavior.Strict);
    private readonly Mock<IDataClient> _dataClientMock = new(MockBehavior.Strict);
    private readonly Mock<IInstanceClient> _instanceClientMock = new(MockBehavior.Strict);
    private readonly Mock<IDataProcessor> _dataProcessorMock = new(MockBehavior.Strict);
    private readonly Mock<IAppModel> _appModelMock = new(MockBehavior.Strict);
    private readonly Mock<IAppMetadata> _appMetadataMock = new(MockBehavior.Strict);
    private readonly TelemetrySink _telemetrySink = new();
    private readonly Mock<IWebHostEnvironment> _webHostEnvironment = new(MockBehavior.Strict);
    private readonly Mock<IAppResources> _appResourcesMock = new(MockBehavior.Strict);
    private readonly Mock<IDataElementAccessChecker> _dataElementAccessCheckerMock = new(MockBehavior.Strict);

    // ValidatorMocks
    private readonly Mock<IFormDataValidator> _formDataValidator = new(MockBehavior.Strict);
    private readonly Mock<IDataElementValidator> _dataElementValidator = new(MockBehavior.Strict);

    private readonly IServiceProvider _serviceProvider;

    // System under test
    private readonly InternalPatchService _patchService;
    private readonly ModelSerializationService _modelSerializationService;

    public PatchServiceTests()
    {
        var applicationMetadata = new ApplicationMetadata("ttd/test") { DataTypes = [_dataType] };
        _appMetadataMock
            .Setup(a => a.GetApplicationMetadata())
            .ReturnsAsync(applicationMetadata)
            .Verifiable(Times.AtLeastOnce);
        _appModelMock
            .Setup(a => a.GetModelType("Altinn.App.Core.Tests.Internal.Patch.PatchServiceTests+MyModel"))
            .Returns(typeof(MyModel))
            .Verifiable();
        _formDataValidator.Setup(fdv => fdv.DataType).Returns(_dataType.Id);
        _formDataValidator.Setup(fdv => fdv.ValidationSource).Returns("formDataValidator");
        _formDataValidator.Setup(fdv => fdv.HasRelevantChanges(It.IsAny<object>(), It.IsAny<object>())).Returns(true);
        _formDataValidator.SetupGet(fdv => fdv.NoIncrementalValidation).Returns(false);
        _dataElementValidator.Setup(dev => dev.DataType).Returns(_dataType.Id);
        _dataElementValidator.Setup(dev => dev.ValidationSource).Returns("dataElementValidator");
        _dataElementValidator.SetupGet(fdv => fdv.NoIncrementalValidation).Returns(true);
        _dataClientMock
            .Setup(d =>
                d.UpdateBinaryData(
                    It.IsAny<InstanceIdentifier>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<Guid>(),
                    It.IsAny<Stream>(),
                    It.IsAny<StorageAuthenticationMethod>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(_dataElement)
            .Verifiable();

        _dataElementAccessCheckerMock
            .Setup(x => x.CanRead(It.IsAny<Instance>(), It.IsAny<DataType>()))
            .ReturnsAsync(true);

        _webHostEnvironment.SetupGet(whe => whe.EnvironmentName).Returns("Development");
        var services = new ServiceCollection();
        services.AddAppImplementationFactory();
        services.AddSingleton<IDataElementValidator>(_dataElementValidator.Object);
        services.AddSingleton<IFormDataValidator>(_formDataValidator.Object);
        services.AddSingleton<IValidatorFactory, ValidatorFactory>();
        services.AddTransient<InstanceDataUnitOfWorkInitializer>();
        services.AddSingleton(_appMetadataMock.Object);
        services.AddSingleton(_dataProcessorMock.Object);
        services.AddSingleton(_appResourcesMock.Object);
        services.AddSingleton(_dataClientMock.Object);
        services.AddSingleton(_instanceClientMock.Object);
        services.AddSingleton(_dataElementAccessCheckerMock.Object);
        _modelSerializationService = new ModelSerializationService(_appModelMock.Object);
        services.AddSingleton(_modelSerializationService);
        services.Configure<GeneralSettings>(_ => { });

        _serviceProvider = services.BuildStrictServiceProvider();
        var validatorFactory = _serviceProvider.GetRequiredService<IValidatorFactory>();
        var validationService = new ValidationService(
            validatorFactory,
            _translationService.Object,
            _vLoggerMock.Object
        );

        _patchService = new InternalPatchService(
            validationService,
            _webHostEnvironment.Object,
            _serviceProvider,
            _telemetrySink.Object
        );
    }

    private static readonly DataType _dataType = new()
    {
        Id = "dataTypeId",
        AppLogic = new() { ClassRef = "Altinn.App.Core.Tests.Internal.Patch.PatchServiceTests+MyModel" },
        TaskId = "Task_1",
    };

    private static readonly DataElement _dataElement = new() { Id = _dataGuid.ToString(), DataType = _dataType.Id };

    public class MyModel
    {
        [MinLength(20)]
        public string? Name { get; set; }
    }

    [Fact]
    public async Task Test_Ok()
    {
        JsonPatch jsonPatch = new JsonPatch(PatchOperation.Replace(JsonPointer.Parse("/Name"), "Test Testesen"));
        List<string> ignoredValidators = new List<string> { "required" };
        var oldModel = new MyModel { Name = "OrginaltNavn" };
        SetupDataClient(oldModel);
        var validationIssues = new List<ValidationIssue>()
        {
            new() { Severity = ValidationIssueSeverity.Error, Description = "First error" },
        };

        _dataProcessorMock
            .Setup(d =>
                d.ProcessDataWrite(
                    It.IsAny<Instance>(),
                    It.IsAny<Guid>(),
                    It.IsAny<MyModel>(),
                    It.IsAny<MyModel?>(),
                    null
                )
            )
            .Returns(() => Task.CompletedTask);
        _formDataValidator
            .Setup(fdv =>
                fdv.ValidateFormData(
                    It.Is<Instance>(i => i == _instance),
                    It.Is<DataElement>(de => de == _dataElement),
                    It.IsAny<MyModel>(),
                    null
                )
            )
            .ReturnsAsync(validationIssues);

        // Act
        var patches = new Dictionary<Guid, JsonPatch>() { { _dataGuid, jsonPatch } };
        var response = await _patchService.ApplyPatches(_instance, patches, null, ignoredValidators);

        // Assert
        response.Should().NotBeNull();
        response.Success.Should().BeTrue();
        response.Ok.Should().NotBeNull();
        var res = response.Ok!;
        var change = res.FormDataChanges.FormDataChanges.Should().ContainSingle().Which;
        change.DataElementIdentifier.Id.Should().Be(_dataGuid.ToString());
        change.CurrentFormData.Should().BeOfType<MyModel>().Subject.Name.Should().Be("Test Testesen");
        var validator = res.ValidationIssues.Should().ContainSingle().Which;
        validator.Source.Should().Be("formDataValidator");
        var issue = validator.Issues.Should().ContainSingle().Which;
        issue.Description.Should().Be("First error");
        _dataProcessorMock.Verify(d =>
            d.ProcessDataWrite(It.IsAny<Instance>(), It.IsAny<Guid>(), It.IsAny<MyModel>(), It.IsAny<MyModel?>(), null)
        );

        await Verify(_telemetrySink.GetSnapshot());
    }

    [Fact]
    public async Task Test_JsonPatchTest_fail()
    {
        JsonPatch jsonPatch = new JsonPatch(
            PatchOperation.Test(JsonPointer.Parse("/Name"), "NotOriginalName"),
            PatchOperation.Replace(JsonPointer.Parse("/Name"), "Test Testesen")
        );
        List<string> ignoredValidators = new List<string> { "required" };
        var oldModel = new MyModel { Name = "OrginaltNavn" };
        SetupDataClient(oldModel);
        var validationIssues = new List<ValidationIssue>()
        {
            new() { Severity = ValidationIssueSeverity.Error, Description = "First error" },
        };

        _dataProcessorMock
            .Setup(d =>
                d.ProcessDataWrite(
                    It.IsAny<Instance>(),
                    It.IsAny<Guid>(),
                    It.IsAny<MyModel>(),
                    It.IsAny<MyModel?>(),
                    null
                )
            )
            .Returns(() => Task.CompletedTask);
        _formDataValidator
            .Setup(fdv =>
                fdv.ValidateFormData(
                    It.Is<Instance>(i => i == _instance),
                    It.Is<DataElement>(de => de == _dataElement),
                    It.IsAny<MyModel>(),
                    null
                )
            )
            .ReturnsAsync(validationIssues);

        // Act
        var patches = new Dictionary<Guid, JsonPatch>() { { _dataGuid, jsonPatch } };
        var response = await _patchService.ApplyPatches(_instance, patches, null, ignoredValidators);

        // Assert
        response.Should().NotBeNull();
        response.Success.Should().BeFalse();
        var err = response.Error;
        err.Should().NotBeNull();
        err!.Title.Should().Be("Precondition in patch failed");
        err.Detail.Should().Be("Path `/Name` is not equal to the indicated value.");
        err.Status.Should().Be(StatusCodes.Status409Conflict);
        var errType = err.Should().BeOfType<DataPatchError>().Which;
        errType.PreviousModel.Should().BeEquivalentTo(oldModel);
        errType.DataElementId.Should().Be(_dataGuid);
        errType.PatchOperationIndex.Should().Be(0);
    }

    [Fact]
    public async Task Test_JsonPatch_does_not_deserialize()
    {
        JsonPatch jsonPatch = new JsonPatch(PatchOperation.Add(JsonPointer.Parse("/Age"), 1));
        List<string> ignoredValidators = new List<string> { "required" };
        var oldModel = new MyModel { Name = "OrginaltNavn" };
        SetupDataClient(oldModel);
        var validationIssues = new List<ValidationIssue>()
        {
            new() { Severity = ValidationIssueSeverity.Error, Description = "First error" },
        };

        _dataProcessorMock
            .Setup(d =>
                d.ProcessDataWrite(
                    It.IsAny<Instance>(),
                    It.IsAny<Guid>(),
                    It.IsAny<MyModel>(),
                    It.IsAny<MyModel?>(),
                    null
                )
            )
            .Returns(() => Task.CompletedTask);
        _formDataValidator
            .Setup(fdv =>
                fdv.ValidateFormData(
                    It.Is<Instance>(i => i == _instance),
                    It.Is<DataElement>(de => de == _dataElement),
                    It.IsAny<MyModel>(),
                    null
                )
            )
            .ReturnsAsync(validationIssues);

        // Act
        var patches = new Dictionary<Guid, JsonPatch>() { { _dataGuid, jsonPatch } };
        var response = await _patchService.ApplyPatches(_instance, patches, null, ignoredValidators);

        // Assert
        response.Should().NotBeNull();
        var err = response.Error;
        err.Should().NotBeNull();
        err!.Title.Should().Be("Patch operation did not deserialize");
        err.Detail.Should()
            .Be(
                "The JSON property 'Age' could not be mapped to any .NET member contained in type 'Altinn.App.Core.Tests.Internal.Patch.PatchServiceTests+MyModel'."
            );
        err.Status.Should().Be((int)HttpStatusCode.UnprocessableEntity);
    }

    private void SetupDataClient(MyModel oldModel)
    {
        _dataClientMock
            .Setup(d =>
                d.GetDataBytes(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<int>(),
                    It.IsAny<Guid>(),
                    It.IsAny<Guid>(),
                    It.IsAny<StorageAuthenticationMethod>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(_modelSerializationService.SerializeToXml(oldModel).ToArray())
            .Verifiable();
    }

    public void Dispose()
    {
        _telemetrySink.Dispose();
        if (_serviceProvider is IDisposable disposable)
            disposable.Dispose();
    }
}
