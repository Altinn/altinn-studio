using System.ComponentModel.DataAnnotations;
using Altinn.App.Common.Tests;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Patch;
using Altinn.App.Core.Internal.Validation;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Json.Patch;
using Json.Pointer;
using Microsoft.Extensions.Logging;
using Moq;
using DataType = Altinn.Platform.Storage.Interface.Models.DataType;

namespace Altinn.App.Core.Tests.Internal.Patch;

public class PatchServiceTests : IDisposable
{
    // Test data
    private static readonly Guid DataGuid = new("12345678-1234-1234-1234-123456789123");

    private readonly Instance _instance = new() { Id = "1337/12345678-1234-1234-1234-12345678912a" };

    // Service mocks
    private readonly Mock<ILogger<ValidationService>> _vLoggerMock = new(MockBehavior.Loose);
    private readonly Mock<IDataClient> _dataClientMock = new(MockBehavior.Strict);
    private readonly Mock<IDataProcessor> _dataProcessorMock = new(MockBehavior.Strict);
    private readonly Mock<IAppModel> _appModelMock = new(MockBehavior.Strict);
    private readonly Mock<IAppMetadata> _appMetadataMock = new(MockBehavior.Strict);
    private readonly TelemetrySink _telemetrySink = new();

    // ValidatorMocks
    private readonly Mock<IFormDataValidator> _formDataValidator = new(MockBehavior.Strict);
    private readonly Mock<IDataElementValidator> _dataElementValidator = new(MockBehavior.Strict);

    // System under test
    private readonly PatchService _patchService;

    public PatchServiceTests()
    {
        _appMetadataMock
            .Setup(a => a.GetApplicationMetadata())
            .ReturnsAsync(new ApplicationMetadata("ttd/test"))
            .Verifiable();
        _appModelMock
            .Setup(a => a.GetModelType("Altinn.App.Core.Tests.Internal.Patch.PatchServiceTests+MyModel"))
            .Returns(typeof(MyModel))
            .Verifiable();
        _formDataValidator.Setup(fdv => fdv.DataType).Returns(_dataType.Id);
        _formDataValidator.Setup(fdv => fdv.ValidationSource).Returns("formDataValidator");
        _formDataValidator.Setup(fdv => fdv.HasRelevantChanges(It.IsAny<object>(), It.IsAny<object>())).Returns(true);
        _dataClientMock
            .Setup(d =>
                d.UpdateData<object>(
                    It.IsAny<MyModel>(),
                    It.IsAny<Guid>(),
                    It.IsAny<Type>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<int>(),
                    It.IsAny<Guid>()
                )
            )
            .ReturnsAsync(_dataElement)
            .Verifiable();
        var validatorFactory = new ValidatorFactory(
            Enumerable.Empty<ITaskValidator>(),
            new List<IDataElementValidator>() { _dataElementValidator.Object },
            new List<IFormDataValidator>() { _formDataValidator.Object }
        );
        var validationService = new ValidationService(
            validatorFactory,
            _dataClientMock.Object,
            _appModelMock.Object,
            _appMetadataMock.Object,
            _vLoggerMock.Object
        );
        _patchService = new PatchService(
            _appMetadataMock.Object,
            _dataClientMock.Object,
            validationService,
            new List<IDataProcessor> { _dataProcessorMock.Object },
            _appModelMock.Object,
            _telemetrySink.Object
        );
    }

    private readonly DataType _dataType =
        new()
        {
            Id = "dataTypeId",
            AppLogic = new() { ClassRef = "Altinn.App.Core.Tests.Internal.Patch.PatchServiceTests+MyModel" }
        };

    private readonly DataElement _dataElement = new() { Id = DataGuid.ToString(), DataType = "dataTypeId" };

    private class MyModel
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
        _dataClientMock
            .Setup(d =>
                d.GetFormData(
                    It.IsAny<Guid>(),
                    It.IsAny<Type>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<int>(),
                    It.IsAny<Guid>()
                )
            )
            .ReturnsAsync(oldModel)
            .Verifiable();
        var validationIssues = new List<ValidationIssue>()
        {
            new() { Severity = ValidationIssueSeverity.Error, Description = "First error", }
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
        var response = await _patchService.ApplyPatch(
            _instance,
            _dataType,
            _dataElement,
            jsonPatch,
            null,
            ignoredValidators
        );

        // Assert
        response.Should().NotBeNull();
        response.Success.Should().BeTrue();
        response.Ok.Should().NotBeNull();
        var res = response.Ok!;
        res.NewDataModel.Should().BeOfType<MyModel>().Subject.Name.Should().Be("Test Testesen");
        var validator = res.ValidationIssues.Should().ContainSingle().Which;
        validator.Key.Should().Be("formDataValidator");
        var issue = validator.Value.Should().ContainSingle().Which;
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
        _dataClientMock
            .Setup(d =>
                d.GetFormData(
                    It.IsAny<Guid>(),
                    It.IsAny<Type>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<int>(),
                    It.IsAny<Guid>()
                )
            )
            .ReturnsAsync(oldModel)
            .Verifiable();
        var validationIssues = new List<ValidationIssue>()
        {
            new() { Severity = ValidationIssueSeverity.Error, Description = "First error", }
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
        var response = await _patchService.ApplyPatch(
            _instance,
            _dataType,
            _dataElement,
            jsonPatch,
            null,
            ignoredValidators
        );

        // Assert
        response.Should().NotBeNull();
        response.Success.Should().BeFalse();
        var err = response.Error;
        err.Should().NotBeNull();
        err!.Title.Should().Be("Precondition in patch failed");
        err.Detail.Should().Be("Path `/Name` is not equal to the indicated value.");
        err.ErrorType.Should().Be(DataPatchErrorType.PatchTestFailed);
        err.Extensions.Should().ContainKey("previousModel");
        err.Extensions.Should().ContainKey("patchOperationIndex");
    }

    [Fact]
    public async Task Test_JsonPatch_does_not_deserialize()
    {
        JsonPatch jsonPatch = new JsonPatch(PatchOperation.Add(JsonPointer.Parse("/Age"), 1));
        List<string> ignoredValidators = new List<string> { "required" };
        var oldModel = new MyModel { Name = "OrginaltNavn" };
        _dataClientMock
            .Setup(d =>
                d.GetFormData(
                    It.IsAny<Guid>(),
                    It.IsAny<Type>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<int>(),
                    It.IsAny<Guid>()
                )
            )
            .ReturnsAsync(oldModel)
            .Verifiable();
        var validationIssues = new List<ValidationIssue>()
        {
            new() { Severity = ValidationIssueSeverity.Error, Description = "First error", }
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
        var response = await _patchService.ApplyPatch(
            _instance,
            _dataType,
            _dataElement,
            jsonPatch,
            null,
            ignoredValidators
        );

        // Assert
        response.Should().NotBeNull();
        var err = response.Error;
        err.Should().NotBeNull();
        err!.Title.Should().Be("Patch operation did not deserialize");
        err.Detail.Should()
            .Be(
                "The JSON property 'Age' could not be mapped to any .NET member contained in type 'Altinn.App.Core.Tests.Internal.Patch.PatchServiceTests+MyModel'."
            );
        err.ErrorType.Should().Be(DataPatchErrorType.DeserializationFailed);
    }

    public void Dispose()
    {
        _telemetrySink.Dispose();
    }
}
