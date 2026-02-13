using System.Text.Json.Serialization;
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
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Moq;

namespace Altinn.App.Core.Tests.Features.Validators.LegacyValidationServiceTests;

public sealed class ValidationServiceTests : IDisposable
{
    public class MyModel
    {
        [JsonPropertyName("name")]
        public string? Name { get; set; }

        [JsonPropertyName("age")]
        public int? Age { get; set; }
    }

    private const int DefaultPartyId = 234;
    private static readonly Guid _defaultInstanceId = Guid.NewGuid();
    private static readonly Guid _defaultDataElementId = Guid.NewGuid();
    private const string DefaultTaskId = "Task_1";
    private const string DefaultOrg = "org";
    private const string DefaultApp = "app";
    private const string DefaultAppId = $"{DefaultOrg}/{DefaultApp}";
    private const string DefaultLanguage = "defaultLanguageCode";

    private static readonly DataElement _defaultDataElement = new()
    {
        Id = _defaultDataElementId.ToString(),
        DataType = "MyType",
        ContentType = "application/xml",
    };

    private static readonly DataType _defaultDataType = new()
    {
        Id = "MyType",
        TaskId = DefaultTaskId,
        AppLogic = new ApplicationLogic { ClassRef = typeof(MyModel).FullName },
    };

    private static readonly DataType _neverataType = new()
    {
        Id = "never",
        TaskId = DefaultTaskId,
        AppLogic = new ApplicationLogic { ClassRef = typeof(MyModel).FullName },
    };

    private static readonly Instance _defaultInstance = new()
    {
        Id = $"{DefaultPartyId}/{_defaultInstanceId}",
        InstanceOwner = new InstanceOwner() { PartyId = DefaultPartyId.ToString() },
        Org = DefaultOrg,
        AppId = DefaultAppId,
        Data = [_defaultDataElement],
        Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_1" } },
    };

    private static readonly ApplicationMetadata _defaultAppMetadata = new(DefaultAppId)
    {
        DataTypes = new List<DataType> { _defaultDataType, _neverataType },
    };

    private readonly Mock<ILogger<ValidationService>> _loggerMock = new();
    private readonly Mock<IDataClient> _dataClientMock = new(MockBehavior.Strict);
    private readonly Mock<IInstanceClient> _instanceClientMock = new(MockBehavior.Strict);
    private readonly Mock<IDataElementAccessChecker> _dataElementAccessCheckerMock = new(MockBehavior.Strict);
    private readonly Mock<IHostEnvironment> _hostEnvironmentMock = new(MockBehavior.Strict);

    private readonly IInstanceDataAccessor _dataAccessor;

    private readonly Mock<IAppModel> _appModelMock = new(MockBehavior.Strict);
    private readonly Mock<IAppMetadata> _appMetadataMock = new(MockBehavior.Strict);
    private readonly Mock<ITranslationService> _translationServiceMock = new(MockBehavior.Loose);

    // Specific validators for this task.
    private readonly Mock<ITaskValidator> _taskValidatorMock = new(MockBehavior.Strict)
    {
        Name = "specificTaskValidator",
    };
    private readonly Mock<IDataElementValidator> _dataElementValidatorMock = new(MockBehavior.Strict)
    {
        Name = "specificDataElementValidator",
    };
    private readonly Mock<IFormDataValidator> _formDataValidatorMock = new(MockBehavior.Strict)
    {
        Name = "specificFormDataValidator",
    };

    // Never run validators (to ensure that a validator with a specific task id is not run for other tasks)
    private readonly Mock<ITaskValidator> _taskValidatorNeverMock = new(MockBehavior.Strict)
    {
        Name = "neverTaskValidator",
    };
    private readonly Mock<IDataElementValidator> _dataElementValidatorNeverMock = new(MockBehavior.Strict)
    {
        Name = "neverDataElementValidator",
    };
    private readonly Mock<IFormDataValidator> _formDataValidatorNeverMock = new(MockBehavior.Strict)
    {
        Name = "neverFormDataValidator",
    };

    // Always run validators * for all tasks
    private readonly Mock<ITaskValidator> _taskValidatorAlwaysMock = new(MockBehavior.Strict)
    {
        Name = "alwaysTaskValidator",
    };
    private readonly Mock<IDataElementValidator> _dataElementValidatorAlwaysMock = new(MockBehavior.Strict)
    {
        Name = "alwaysDataElementValidator",
    };
    private readonly Mock<IFormDataValidator> _formDataValidatorAlwaysMock = new(MockBehavior.Strict)
    {
        Name = "alwaysFormDataValidator",
    };
    private readonly ModelSerializationService _modelSerialization;

    private readonly ServiceCollection _serviceCollection = new();

    public ValidationServiceTests()
    {
        _dataElementAccessCheckerMock
            .Setup(x => x.CanRead(It.IsAny<Instance>(), It.IsAny<DataType>()))
            .ReturnsAsync(true);
        _hostEnvironmentMock.SetupGet(h => h.EnvironmentName).Returns(Environments.Development);

        _modelSerialization = new ModelSerializationService(_appModelMock.Object);
        _dataAccessor = new InstanceDataUnitOfWork(
            _defaultInstance,
            _dataClientMock.Object,
            _instanceClientMock.Object,
            _defaultAppMetadata,
            _translationServiceMock.Object,
            _modelSerialization,
            null!,
            null!,
            DefaultTaskId,
            DefaultLanguage,
            null
        );
        _serviceCollection.AddAppImplementationFactory();
        _serviceCollection.AddSingleton(_loggerMock.Object);
        _serviceCollection.AddSingleton(_dataClientMock.Object);
        _serviceCollection.AddSingleton<IValidationService, ValidationService>();
        _serviceCollection.AddSingleton(_appModelMock.Object);
        _appModelMock.Setup(a => a.GetModelType(typeof(MyModel).FullName!)).Returns(typeof(MyModel));
        _serviceCollection.AddSingleton(_appMetadataMock.Object);
        _serviceCollection.AddSingleton(_translationServiceMock.Object);
        _appMetadataMock.Setup(a => a.GetApplicationMetadata()).ReturnsAsync(_defaultAppMetadata);
        _serviceCollection.AddSingleton<IValidatorFactory, ValidatorFactory>();
        _serviceCollection.AddSingleton(_dataElementAccessCheckerMock.Object);
        _serviceCollection.AddSingleton(_hostEnvironmentMock.Object);
        _serviceCollection.AddSingleton(Microsoft.Extensions.Options.Options.Create(new GeneralSettings()));
        _serviceCollection.AddSingleton(Microsoft.Extensions.Options.Options.Create(new AppSettings()));

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
        SetupDataElementValidatorType(_dataElementValidatorMock, _defaultDataType.Id, "specificDataElementValidator");
        _serviceCollection.AddSingleton(_formDataValidatorMock.Object);
        SetupFormDataValidatorType(_formDataValidatorMock, _defaultDataType.Id, "specificValidator");

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
        taskValidatorMock.Setup(v => v.TaskId).Returns(taskId);
        taskValidatorMock.Setup(v => v.ValidationSource).Returns(validationSource);
        taskValidatorMock.Setup(v => v.NoIncrementalValidation).Returns(true);
    }

    private void SetupTaskValidatorReturn(
        Mock<ITaskValidator> taskValidatorMock,
        List<ValidationIssue> validationIssues,
        Times? times = default
    )
    {
        taskValidatorMock
            .Setup(v => v.ValidateTask(_defaultInstance, DefaultTaskId, DefaultLanguage))
            .ReturnsAsync(validationIssues)
            .Verifiable(times ?? Times.Once());
    }

    private void SetupDataElementValidatorType(
        Mock<IDataElementValidator> taskValidatorMock,
        string dataType,
        string validationSource
    )
    {
        taskValidatorMock.Setup(v => v.DataType).Returns(dataType);
        taskValidatorMock.Setup(v => v.ValidationSource).Returns(validationSource);
        taskValidatorMock.SetupGet(v => v.NoIncrementalValidation).Returns(true);
    }

    private void SetupDataElementValidatorReturn(
        Mock<IDataElementValidator> dataElementValidatorMock,
        List<ValidationIssue> validationIssues,
        Times? times = default
    )
    {
        dataElementValidatorMock
            .Setup(v => v.ValidateDataElement(_defaultInstance, _defaultDataElement, _defaultDataType, DefaultLanguage))
            .ReturnsAsync(validationIssues)
            .Verifiable(times ?? Times.Once());
    }

    private void SetupFormDataValidatorType(
        Mock<IFormDataValidator> formDataValidatorMock,
        string dataType,
        string validationSource
    )
    {
        formDataValidatorMock.SetupGet(v => v.NoIncrementalValidation).Returns(false);
        formDataValidatorMock.SetupGet(v => v.ShouldRunAfterRemovingHiddenData).Returns(false);

        // DataType
        formDataValidatorMock.Setup(v => v.DataType).Returns(dataType);

        // ValidatorName (used for source)
        formDataValidatorMock.Setup(v => v.ValidationSource).Returns(validationSource);
    }

    private void SetupFormDataValidatorReturn(
        Mock<IFormDataValidator> formDataValidatorMock,
        bool? hasRelevantChanges,
        Func<MyModel, List<ValidationIssue>> func,
        Times? times = default
    )
    {
        // ValidateFormData
        formDataValidatorMock
            .Setup(v => v.ValidateFormData(_defaultInstance, _defaultDataElement, It.IsAny<MyModel>(), DefaultLanguage))
            .ReturnsAsync((Instance instance, DataElement dataElement, MyModel data, string? language) => func(data))
            .Verifiable(hasRelevantChanges is not false ? (times ?? Times.Once()) : Times.Never());

        // HasRelevantChanges
        formDataValidatorMock
            .Setup(v => v.HasRelevantChanges(It.IsAny<object>(), It.IsAny<object>()))
            .Returns(hasRelevantChanges ?? false)
            .Verifiable(hasRelevantChanges is null ? Times.Never : Times.AtLeastOnce);
    }

    private void SourcePropertyIsSet(List<ValidationSourcePair> result)
    {
        var issues = result.SelectMany(p => p.Issues).ToArray();
        if (issues.Length == 0)
        {
            return;
        }
        issues.Should().AllSatisfy(i => i.Source.Should().NotBeNull());
    }

    private void SourcePropertyIsSet(List<ValidationIssueWithSource> result)
    {
        Assert.All(
            result,
            issue =>
            {
                Assert.NotNull(issue.Source);
                Assert.NotEqual("[]", issue.Source);
            }
        );
    }

    private void SetupDataClient(MyModel data)
    {
        _dataClientMock
            .Setup(d =>
                d.GetDataBytes(
                    DefaultPartyId,
                    _defaultInstanceId,
                    _defaultDataElementId,
                    It.IsAny<StorageAuthenticationMethod>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(_modelSerialization.SerializeToXml(data).ToArray())
            .Verifiable(Times.AtLeastOnce);
    }

    [Fact]
    public async Task Validate_WithNoValidators_ReturnsNoErrors()
    {
        _serviceCollection.RemoveAll(typeof(ITaskValidator));
        _serviceCollection.RemoveAll(typeof(IDataElementValidator));
        _serviceCollection.RemoveAll(typeof(IFormDataValidator));

        // Don't call setup as they are removed from the service collection
        await using var serviceProvider = _serviceCollection.BuildStrictServiceProvider();

        var validatorService = serviceProvider.GetRequiredService<IValidationService>();

        var resultTask = await validatorService.ValidateInstanceAtTask(
            _dataAccessor,
            DefaultTaskId,
            null,
            null,
            DefaultLanguage
        );
        resultTask.Should().BeEmpty();
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
                    return new List<ValidationIssue>
                    {
                        {
                            new() { Severity = ValidationIssueSeverity.Error, CustomTextKey = "NameNotOla" }
                        },
                    };
                }

                return new List<ValidationIssue>();
            }
        );
        SetupFormDataValidatorReturn(
            _formDataValidatorAlwaysMock,
            hasRelevantChanges: false,
            model => throw new Exception("Should not be called")
        );

        await using var serviceProvider = _serviceCollection.BuildStrictServiceProvider();

        var validatorService = serviceProvider.GetRequiredService<IValidationService>();
        var data = new MyModel { Name = "Ola" };
        var previousData = new MyModel() { Name = "Kari" };
        SetupDataClient(data);
        var result = await validatorService.ValidateIncrementalFormData(
            _dataAccessor,
            "Task_1",
            new DataElementChanges([
                new FormDataChange(
                    type: ChangeType.Updated,
                    dataElement: _defaultDataElement,
                    dataType: _defaultDataType,
                    contentType: "application/xml",
                    previousFormDataWrapper: FormDataWrapperFactory.Create(previousData),
                    currentFormDataWrapper: FormDataWrapperFactory.Create(data),
                    previousBinaryData: null,
                    currentBinaryData: null
                ),
            ]),
            null,
            DefaultLanguage
        );

        result.Should().ContainSingle(p => p.Source == "specificValidator").Which.Issues.Should().HaveCount(0);
        result.Should().HaveCount(1);
        SourcePropertyIsSet(result);
    }

    [Fact]
    public async Task ValidateFormData_WithMyNameValidator_ReturnsErrorsWhenNameIsKari()
    {
        SetupFormDataValidatorReturn(
            _formDataValidatorMock,
            hasRelevantChanges: true,
            model => new List<ValidationIssue>
            {
                new() { Severity = ValidationIssueSeverity.Error, CustomTextKey = "NameNotOla" },
            }
        );

        SetupFormDataValidatorReturn(
            _formDataValidatorAlwaysMock,
            hasRelevantChanges: true,
            model => new List<ValidationIssue>
            {
                new() { Severity = ValidationIssueSeverity.Error, CustomTextKey = "AlwaysNameNotOla" },
            }
        );

        await using var serviceProvider = _serviceCollection.BuildStrictServiceProvider();

        var validatorService = serviceProvider.GetRequiredService<IValidationService>();
        var data = new MyModel { Name = "Kari" };
        DataElementChanges dataElementChanges = new([
            new FormDataChange(
                type: ChangeType.Updated,
                dataElement: _defaultDataElement,
                dataType: _defaultDataType,
                contentType: "application/xml",
                currentFormDataWrapper: FormDataWrapperFactory.Create(data),
                previousFormDataWrapper: FormDataWrapperFactory.Create(data),
                previousBinaryData: null,
                currentBinaryData: null
            ),
        ]);
        SetupDataClient(data);
        var dataAccessor = new InstanceDataUnitOfWork(
            _defaultInstance,
            _dataClientMock.Object,
            _instanceClientMock.Object,
            _defaultAppMetadata,
            _translationServiceMock.Object,
            _modelSerialization,
            null!,
            null!,
            DefaultTaskId,
            DefaultLanguage,
            null
        );
        var resultData = await validatorService.ValidateIncrementalFormData(
            dataAccessor,
            "Task_1",
            dataElementChanges,
            null,
            DefaultLanguage
        );
        resultData
            .Should()
            .ContainSingle(p => p.Source == "specificValidator")
            .Which.Issues.Should()
            .ContainSingle()
            .Which.CustomTextKey.Should()
            .Be("NameNotOla");
        resultData
            .Should()
            .ContainSingle(p => p.Source == "alwaysUsedValidator")
            .Which.Issues.Should()
            .ContainSingle()
            .Which.CustomTextKey.Should()
            .Be("AlwaysNameNotOla");
        resultData.Should().HaveCount(2);
        SourcePropertyIsSet(resultData);
    }

    [Fact]
    public async Task ValidateTask_ReturnsAllErrorsFromAllLevels()
    {
        List<ValidationIssue> CreateIssues(string code)
        {
            return new List<ValidationIssue>
            {
                new() { Code = code, Severity = ValidationIssueSeverity.Error },
            };
        }

        // Arrange
        SetupTaskValidatorReturn(_taskValidatorMock, CreateIssues("task_validator"));
        SetupTaskValidatorReturn(_taskValidatorAlwaysMock, CreateIssues("task_validator_always"));

        SetupDataElementValidatorReturn(
            _dataElementValidatorMock,
            CreateIssues("data_element_validator"),
            Times.Once()
        );
        SetupDataElementValidatorReturn(
            _dataElementValidatorAlwaysMock,
            CreateIssues("data_element_validator_always"),
            Times.Once()
        );

        SetupFormDataValidatorReturn(
            _formDataValidatorMock,
            hasRelevantChanges: null, /* should not call HasRelevantChanges */
            model => CreateIssues("form_data_validator"),
            Times.Once()
        );

        SetupFormDataValidatorReturn(
            _formDataValidatorAlwaysMock,
            hasRelevantChanges: null, /* should not call HasRelevantChanges */
            model => CreateIssues("form_data_validator_always"),
            Times.Once()
        );

        var data = new MyModel();
        SetupDataClient(data);

        await using var serviceProvider = _serviceCollection.BuildStrictServiceProvider();
        var validationService = serviceProvider.GetRequiredService<IValidationService>();

        var dataAccessor = new InstanceDataUnitOfWork(
            _defaultInstance,
            _dataClientMock.Object,
            _instanceClientMock.Object,
            _defaultAppMetadata,
            _translationServiceMock.Object,
            _modelSerialization,
            null!,
            null!,
            DefaultTaskId,
            DefaultLanguage,
            null
        );

        var taskResult = await validationService.ValidateInstanceAtTask(
            dataAccessor,
            DefaultTaskId,
            null,
            null,
            DefaultLanguage
        );

        taskResult
            .Should()
            .Contain(i => i.Code == "task_validator")
            .Which.Severity.Should()
            .Be(ValidationIssueSeverity.Error);
        taskResult
            .Should()
            .Contain(i => i.Code == "task_validator_always")
            .Which.Severity.Should()
            .Be(ValidationIssueSeverity.Error);
        taskResult
            .Should()
            .Contain(i => i.Code == "data_element_validator")
            .Which.Severity.Should()
            .Be(ValidationIssueSeverity.Error);
        taskResult
            .Should()
            .Contain(i => i.Code == "data_element_validator_always")
            .Which.Severity.Should()
            .Be(ValidationIssueSeverity.Error);
        taskResult
            .Should()
            .Contain(i => i.Code == "form_data_validator")
            .Which.Severity.Should()
            .Be(ValidationIssueSeverity.Error);
        taskResult
            .Should()
            .Contain(i => i.Code == "form_data_validator_always")
            .Which.Severity.Should()
            .Be(ValidationIssueSeverity.Error);
        taskResult.Should().HaveCount(6);
        SourcePropertyIsSet(taskResult);
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

        await using var serviceProvider = _serviceCollection.BuildStrictServiceProvider();
        var validationService = serviceProvider.GetRequiredService<IValidationService>();

        var result = await validationService.ValidateInstanceAtTask(
            _dataAccessor,
            DefaultTaskId,
            null,
            null,
            DefaultLanguage
        );

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
        _appMetadataMock.Verify();
        _appModelMock.Verify();
        _loggerMock.Verify();

        _dataClientMock.Verify();
    }
}
