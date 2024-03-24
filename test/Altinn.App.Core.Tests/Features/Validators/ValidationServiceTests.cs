using System.Text.Json.Serialization;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Validation;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace Altinn.App.Core.Tests.Features.Validators;

public class ValidationServiceTests : IDisposable
{
    private class MyModel
    {
        [JsonPropertyName("name")]
        public string? Name { get; set; }

        [JsonPropertyName("age")]
        public int? Age { get; set; }
    }

    private const int DefaultPartyId = 234;
    private static readonly Guid DefaultInstanceId = Guid.NewGuid();
    private static readonly Guid DefaultDataElementId = Guid.NewGuid();
    private const string DefaultTaskId = "Task_1";
    private const string DefaultOrg = "org";
    private const string DefaultApp = "app";
    private const string DefaultAppId = $"{DefaultOrg}/{DefaultApp}";
    private const string DefaultLanguage = "defaultLanguageCode";

    private static readonly DataElement DefaultDataElement = new()
    {
        Id = DefaultDataElementId.ToString(),
        DataType = "MyType",
    };

    private static readonly DataType DefaultDataType = new()
    {
        Id = "MyType",
        TaskId = DefaultTaskId,
        AppLogic = new ApplicationLogic
        {
            ClassRef = typeof(MyModel).FullName
        }
    };

    private static readonly Instance DefaultInstance = new()
    {
        Id = $"{DefaultPartyId}/{DefaultInstanceId}",
        InstanceOwner = new InstanceOwner()
        {
            PartyId = DefaultPartyId.ToString(),
        },
        Org = DefaultOrg,
        AppId = DefaultAppId,
        Data = new List<DataElement>()
        {
            DefaultDataElement,
        }
    };

    private static readonly ApplicationMetadata DefaultAppMetadata = new(DefaultAppId)
    {
        DataTypes = new List<DataType>
        {
            DefaultDataType,
        },
    };

    private readonly Mock<ILogger<ValidationService>> _loggerMock = new();
    private readonly Mock<IDataClient> _dataClientMock = new(MockBehavior.Strict);

    private readonly Mock<IAppModel> _appModelMock = new(MockBehavior.Strict);
    private readonly Mock<IAppMetadata> _appMetadataMock = new(MockBehavior.Strict);

    // Specific validators for this task.
    private readonly Mock<ITaskValidator> _taskValidatorMock = new(MockBehavior.Strict) { Name = "specificTaskValidator" };
    private readonly Mock<IDataElementValidator> _dataElementValidatorMock = new(MockBehavior.Strict) { Name = "specificDataElementValidator" };
    private readonly Mock<IFormDataValidator> _formDataValidatorMock = new(MockBehavior.Strict) { Name = "specificFormDataValidator" };

    // Never run validators (to ensure that a validator with a specific task id is not run for other tasks)
    private readonly Mock<ITaskValidator> _taskValidatorNeverMock = new(MockBehavior.Strict) { Name = "neverTaskValidator" };
    private readonly Mock<IDataElementValidator> _dataElementValidatorNeverMock = new(MockBehavior.Strict) { Name = "neverDataElementValidator" };
    private readonly Mock<IFormDataValidator> _formDataValidatorNeverMock = new(MockBehavior.Strict) { Name = "neverFormDataValidator" };

    // Always run validators * for all tasks
    private readonly Mock<ITaskValidator> _taskValidatorAlwaysMock = new(MockBehavior.Strict) { Name = "alwaysTaskValidator" };
    private readonly Mock<IDataElementValidator> _dataElementValidatorAlwaysMock = new(MockBehavior.Strict) { Name = "alwaysDataElementValidator" };
    private readonly Mock<IFormDataValidator> _formDataValidatorAlwaysMock = new(MockBehavior.Strict) { Name = "alwaysFormDataValidator" };

    private readonly ServiceCollection _serviceCollection = new();

    public ValidationServiceTests()
    {
        _serviceCollection.AddSingleton(_loggerMock.Object);
        _serviceCollection.AddSingleton(_dataClientMock.Object);
        _serviceCollection.AddSingleton<IValidationService, ValidationService>();
        _serviceCollection.AddSingleton(_appModelMock.Object);
        _appModelMock.Setup(a => a.GetModelType(typeof(MyModel).FullName!)).Returns(typeof(MyModel));
        _serviceCollection.AddSingleton(_appMetadataMock.Object);
        _appMetadataMock.Setup(a => a.GetApplicationMetadata())
            .ReturnsAsync(DefaultAppMetadata);
        _serviceCollection.AddSingleton<IValidatorFactory, ValidatorFactory>();

        // NeverUsedValidators
        _serviceCollection.AddSingleton(_taskValidatorNeverMock.Object);
        SetupTaskValidatorType(_taskValidatorNeverMock, "never", "neverTask");
        _serviceCollection.AddSingleton(_dataElementValidatorNeverMock.Object);
        SetupDataElementValidatorType(_dataElementValidatorNeverMock, "never", "neverDataElementValidator");
        _serviceCollection.AddSingleton(_formDataValidatorNeverMock.Object);
        SetupFormDataValidatorType(_formDataValidatorNeverMock, "never", "neverUsedValidator");

        // SpecificValidators
        _serviceCollection.AddSingleton(_taskValidatorMock.Object);
        SetupTaskValidatorType(_taskValidatorMock, DefaultTaskId, "specificTaskValidator");
        _serviceCollection.AddSingleton(_dataElementValidatorMock.Object);
        SetupDataElementValidatorType(_dataElementValidatorMock, DefaultDataType.Id, "specificDataElementValidator");
        _serviceCollection.AddSingleton(_formDataValidatorMock.Object);
        SetupFormDataValidatorType(_formDataValidatorMock, DefaultDataType.Id, "specificValidator");

        // AlwaysUsedValidators
        _serviceCollection.AddSingleton(_taskValidatorAlwaysMock.Object);
        SetupTaskValidatorType(_taskValidatorAlwaysMock, "*", "alwaysTaskValidator");
        _serviceCollection.AddSingleton(_dataElementValidatorAlwaysMock.Object);
        SetupDataElementValidatorType(_dataElementValidatorAlwaysMock, "*", "alwaysDataElementValidator");
        _serviceCollection.AddSingleton(_formDataValidatorAlwaysMock.Object);
        SetupFormDataValidatorType(_formDataValidatorAlwaysMock, "*", "alwaysUsedValidator");
    }

    private void SetupTaskValidatorType(Mock<ITaskValidator> taskValidatorMock, string taskId, string validationSource)
    {
        taskValidatorMock
            .Setup(v => v.TaskId)
            .Returns(taskId);
        taskValidatorMock
            .Setup(v => v.ValidationSource)
            .Returns(validationSource);
    }

    private void SetupTaskValidatorReturn(Mock<ITaskValidator> taskValidatorMock, List<ValidationIssue> validationIssues, Times? times = default)
    {
        taskValidatorMock.Setup(v => v.ValidateTask(DefaultInstance, DefaultTaskId, DefaultLanguage))
            .ReturnsAsync(validationIssues)
            .Verifiable(times ?? Times.Once());
    }

    private void SetupDataElementValidatorType(Mock<IDataElementValidator> taskValidatorMock, string dataType, string validationSource)
    {
        taskValidatorMock
            .Setup(v => v.DataType)
            .Returns(dataType);
        taskValidatorMock
            .Setup(v => v.ValidationSource)
            .Returns(validationSource);
    }

    private void SetupDataElementValidatorReturn(Mock<IDataElementValidator> dataElementValidatorMock, List<ValidationIssue> validationIssues, Times? times = default)
    {
        dataElementValidatorMock.Setup(v => v.ValidateDataElement(DefaultInstance, DefaultDataElement, DefaultDataType, DefaultLanguage))
            .ReturnsAsync(validationIssues)
            .Verifiable(times ?? Times.Once());
    }

    private void SetupFormDataValidatorType(
        Mock<IFormDataValidator> formDataValidatorMock,
        string dataType,
        string validationSource)
    {
        // DataType
        formDataValidatorMock
            .Setup(v => v.DataType)
            .Returns(dataType);

        // ValidatorName (used for source)
        formDataValidatorMock
            .Setup(v => v.ValidationSource)
            .Returns(validationSource);
    }

    private void SetupFormDataValidatorReturn(
        Mock<IFormDataValidator> formDataValidatorMock,
        bool? hasRelevantChanges,
        Func<MyModel, List<ValidationIssue>> func,
        Times? times = default)
    {
        // ValidateFormData
        formDataValidatorMock
            .Setup(v => v.ValidateFormData(DefaultInstance, DefaultDataElement, It.IsAny<MyModel>(), DefaultLanguage))
            .ReturnsAsync((Instance instance, DataElement dataElement, MyModel data, string? language) => func(data))
            .Verifiable(hasRelevantChanges is not false ? (times ?? Times.Once()) : Times.Never());

        // HasRelevantChanges
        formDataValidatorMock
            .Setup(v => v.HasRelevantChanges(It.IsAny<object>(), It.IsAny<object>()))
            .Returns(hasRelevantChanges ?? false)
            .Verifiable(hasRelevantChanges is null ? Times.Never : Times.AtLeastOnce);
    }

    private void SetupDataClient(MyModel data)
    {
        _dataClientMock
            .Setup(d => d.GetFormData(DefaultInstanceId, data.GetType(), DefaultOrg, DefaultApp, DefaultPartyId, DefaultDataElementId))
            .ReturnsAsync(data)
            .Verifiable(Times.AtLeastOnce);
    }

    [Fact]
    public async Task Validate_WithNoValidators_ReturnsNoErrors()
    {
        _serviceCollection.RemoveAll(typeof(ITaskValidator));
        _serviceCollection.RemoveAll(typeof(IDataElementValidator));
        _serviceCollection.RemoveAll(typeof(IFormDataValidator));

        // Don't call setup as they are removed from the service collection
        await using var serviceProvider = _serviceCollection.BuildServiceProvider();

        var validatorService = serviceProvider.GetRequiredService<IValidationService>();
        var data = new MyModel { Name = "Ola" };
        SetupDataClient(data);

        var resultTask = await validatorService.ValidateInstanceAtTask(DefaultInstance, DefaultTaskId, DefaultLanguage);
        resultTask.Should().BeEmpty();

        var resultElement = await validatorService.ValidateDataElement(DefaultInstance, DefaultDataElement, DefaultDataType, DefaultLanguage);
        resultElement.Should().BeEmpty();

        var resultData = await validatorService.ValidateFormData(DefaultInstance, DefaultDataElement, DefaultDataType, data, null, null, DefaultLanguage);
        resultData.Should().BeEmpty();
    }

    [Fact]
    public async Task ValidateFormData_WithSpecificValidator()
    {
        SetupFormDataValidatorReturn(
            _formDataValidatorMock,
            hasRelevantChanges: true,
            model =>
            {
                if (model.Name != "Ola")
                {
                    return new List<ValidationIssue> { { new() { Severity = ValidationIssueSeverity.Error, CustomTextKey = "NameNotOla" } } };
                }

                return new List<ValidationIssue>();
            });
        SetupFormDataValidatorReturn(
            _formDataValidatorAlwaysMock,
            hasRelevantChanges: false,
            model => throw new Exception("Should not be called"));

        await using var serviceProvider = _serviceCollection.BuildServiceProvider();

        var validatorService = serviceProvider.GetRequiredService<IValidationService>();
        var data = new MyModel { Name = "Ola" };
        var previousData = new MyModel() { Name = "Kari" };
        var result = await validatorService.ValidateFormData(DefaultInstance, DefaultDataElement, DefaultDataType, data, previousData, null, DefaultLanguage);

        result.Should().ContainKey("specificValidator").WhoseValue.Should().HaveCount(0);
        result.Should().HaveCount(1);
    }

    [Fact]
    public async Task ValidateFormData_WithMyNameValidator_ReturnsErrorsWhenNameIsKari()
    {
        SetupFormDataValidatorReturn(
            _formDataValidatorMock,
            hasRelevantChanges: null,
            model =>
            new List<ValidationIssue>
            {
                new()
                {
                    Severity = ValidationIssueSeverity.Error,
                    CustomTextKey = "NameNotOla"
                }
            });

        SetupFormDataValidatorReturn(
            _formDataValidatorAlwaysMock,
            hasRelevantChanges: null,
            model => new List<ValidationIssue>
            {
                new()
                {
                    Severity = ValidationIssueSeverity.Error,
                    CustomTextKey = "AlwaysNameNotOla"
                }
            });

        await using var serviceProvider = _serviceCollection.BuildServiceProvider();

        var validatorService = serviceProvider.GetRequiredService<IValidationService>();
        var data = new MyModel { Name = "Kari" };
        var resultData = await validatorService.ValidateFormData(DefaultInstance, DefaultDataElement, DefaultDataType, data, null, null, DefaultLanguage);
        resultData.Should().ContainKey("specificValidator").WhoseValue.Should().ContainSingle().Which.CustomTextKey.Should().Be("NameNotOla");
        resultData.Should().ContainKey("alwaysUsedValidator").WhoseValue.Should().ContainSingle().Which.CustomTextKey.Should().Be("AlwaysNameNotOla");
        resultData.Should().HaveCount(2);
    }

    [Fact]
    public async Task ValidateTask_ReturnsAllErrorsFromAllLevels()
    {
        List<ValidationIssue> CreateIssues(string code)
        {
            return new List<ValidationIssue>
            {
                new()
                {
                    Code = code,
                    Severity = ValidationIssueSeverity.Error,
                }
            };
        }

        // Arrange
        SetupTaskValidatorReturn(_taskValidatorMock, CreateIssues("task_validator"));
        SetupTaskValidatorReturn(_taskValidatorAlwaysMock, CreateIssues("task_validator_always"));

        SetupDataElementValidatorReturn(_dataElementValidatorMock, CreateIssues("data_element_validator"), Times.Exactly(2));
        SetupDataElementValidatorReturn(_dataElementValidatorAlwaysMock, CreateIssues("data_element_validator_always"), Times.Exactly(2));

        SetupFormDataValidatorReturn(
            _formDataValidatorMock,
            hasRelevantChanges: null, /* should not call HasRelevantChanges */
            model => CreateIssues("form_data_validator"),
            Times.Exactly(3));

        SetupFormDataValidatorReturn(
            _formDataValidatorAlwaysMock,
            hasRelevantChanges: null, /* should not call HasRelevantChanges */
            model => CreateIssues("form_data_validator_always"),
            Times.Exactly(3));

        var data = new MyModel();
        SetupDataClient(data);

        using var serviceProvider = _serviceCollection.BuildServiceProvider();
        var validationService = serviceProvider.GetRequiredService<IValidationService>();

        var taskResult = await validationService.ValidateInstanceAtTask(DefaultInstance, DefaultTaskId, DefaultLanguage);

        taskResult.Should().Contain(i => i.Code == "task_validator").Which.Severity.Should().Be(ValidationIssueSeverity.Error);
        taskResult.Should().Contain(i => i.Code == "task_validator_always").Which.Severity.Should().Be(ValidationIssueSeverity.Error);
        taskResult.Should().Contain(i => i.Code == "data_element_validator").Which.Severity.Should().Be(ValidationIssueSeverity.Error);
        taskResult.Should().Contain(i => i.Code == "data_element_validator_always").Which.Severity.Should().Be(ValidationIssueSeverity.Error);
        taskResult.Should().Contain(i => i.Code == "form_data_validator").Which.Severity.Should().Be(ValidationIssueSeverity.Error);
        taskResult.Should().Contain(i => i.Code == "form_data_validator_always").Which.Severity.Should().Be(ValidationIssueSeverity.Error);
        taskResult.Should().HaveCount(6);

        var elementResult = await validationService.ValidateDataElement(DefaultInstance, DefaultDataElement, DefaultDataType, DefaultLanguage);
        elementResult.Should().Contain(i => i.Code == "data_element_validator").Which.Severity.Should().Be(ValidationIssueSeverity.Error);
        elementResult.Should().Contain(i => i.Code == "data_element_validator_always").Which.Severity.Should().Be(ValidationIssueSeverity.Error);
        elementResult.Should().Contain(i => i.Code == "form_data_validator").Which.Severity.Should().Be(ValidationIssueSeverity.Error);
        elementResult.Should().Contain(i => i.Code == "form_data_validator_always").Which.Severity.Should().Be(ValidationIssueSeverity.Error);
        elementResult.Should().HaveCount(4);

        var dataResult = await validationService.ValidateFormData(DefaultInstance, DefaultDataElement, DefaultDataType, data, null, null, DefaultLanguage);
        dataResult.Should()
            .ContainKey("specificValidator").WhoseValue.Should()
            .ContainSingle(i => i.Code == "form_data_validator").Which.Severity.Should().Be(ValidationIssueSeverity.Error);
        dataResult.Should()
            .ContainKey("alwaysUsedValidator").WhoseValue.Should()
            .ContainSingle(i => i.Code == "form_data_validator_always").Which.Severity.Should().Be(ValidationIssueSeverity.Error);
        dataResult.Should().HaveCount(2);
    }

    [Fact]
    public async Task ValidateTask_ReturnsNoErrorsFromAllLevels()
    {
        var noIssues = new List<ValidationIssue>();

        // Arrange
        SetupTaskValidatorReturn(_taskValidatorMock, noIssues);
        SetupTaskValidatorReturn(_taskValidatorAlwaysMock, noIssues);

        SetupDataElementValidatorReturn(_dataElementValidatorMock, noIssues);
        SetupDataElementValidatorReturn(_dataElementValidatorAlwaysMock, noIssues);

        SetupFormDataValidatorReturn(_formDataValidatorMock, hasRelevantChanges: null, model => noIssues);
        SetupFormDataValidatorReturn(_formDataValidatorAlwaysMock, hasRelevantChanges: null, model => noIssues);

        var data = new MyModel();
        SetupDataClient(data);

        using var serviceProvider = _serviceCollection.BuildServiceProvider();
        var validationService = serviceProvider.GetRequiredService<IValidationService>();

        var result = await validationService.ValidateInstanceAtTask(DefaultInstance, DefaultTaskId, DefaultLanguage);

        result.Should().BeEmpty();
    }

    public void Dispose()
    {
        _taskValidatorMock.Verify();
        _dataElementValidatorMock.Verify();
        _formDataValidatorMock.Verify();

        _taskValidatorNeverMock.Verify();
        _dataElementValidatorNeverMock.Verify();
        _formDataValidatorNeverMock.Verify();

        _taskValidatorAlwaysMock.Verify();
        _dataElementValidatorAlwaysMock.Verify();
        _formDataValidatorAlwaysMock.Verify();

        _dataClientMock.Verify();
    }
}