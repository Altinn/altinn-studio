using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Validation;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Internal.Validation;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Validation;
using Altinn.App.Core.Tests.LayoutExpressions.TestUtilities;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit.Abstractions;
using Exception = System.Exception;

namespace Altinn.App.Core.Tests.Features.Validators;

public class ValidationServiceTests : IAsyncLifetime
{
    private const string Org = "ttd";
    private const string App = "app";
    private const string TaskId = "Task_1";

    private readonly ApplicationMetadata _appMetadata = new($"{Org}/{App}") { DataTypes = [] };

    private readonly Instance _instance = new()
    {
        AppId = $"{Org}/{App}",
        Org = Org,
        Data = [],
    };

    private readonly Mock<IAppMetadata> _appMetadataMock = new(MockBehavior.Strict);
    private readonly Mock<ITranslationService> _translationServiceMock = new(MockBehavior.Loose);
    private readonly Mock<IDataElementAccessChecker> _dataElementAccessCheckerMock = new(MockBehavior.Strict);
    private readonly InstanceDataAccessorFake _instanceDataAccessor;
    private readonly IServiceCollection _services = new ServiceCollection();
    private readonly Lazy<ServiceProvider> _serviceProvider;

    public ValidationServiceTests(ITestOutputHelper output)
    {
        _dataElementAccessCheckerMock
            .Setup(x => x.CanRead(It.IsAny<Instance>(), It.IsAny<DataType>()))
            .ReturnsAsync(true);

        _instanceDataAccessor = new InstanceDataAccessorFake(_instance, _appMetadata, TaskId);
        _services.AddTransient<IValidationService, ValidationService>();
        _services.AddTelemetrySink();
        _services.AddFakeLoggingWithXunit(output);
        _services.AddTransient<IValidatorFactory, ValidatorFactory>();
        _services.AddSingleton(_appMetadataMock.Object);
        _services.AddSingleton(_translationServiceMock.Object);
        _services.AddSingleton(_dataElementAccessCheckerMock.Object);
        _services.AddAppImplementationFactory();

        _appMetadataMock.Setup(am => am.GetApplicationMetadata()).ReturnsAsync(_appMetadata);
        _serviceProvider = new(() => _services.BuildStrictServiceProvider());
    }

    public Task InitializeAsync()
    {
        return Task.CompletedTask;
    }

    private Mock<IValidator> RegisterValidatorMock(
        string source,
        bool? hasRelevantChanges = null,
        DataElementChanges? expectedChanges = null,
        List<ValidationIssue>? issues = null,
        string? expectedLanguage = null,
        bool noIncrementalValidation = false
    )
    {
        var mock = new Mock<IValidator>(MockBehavior.Strict);
        mock.Setup(v => v.ShouldRunForTask(TaskId)).Returns(true);
        mock.Setup(v => v.ValidationSource).Returns(source);
        if (hasRelevantChanges.HasValue && expectedChanges is not null)
        {
            mock.Setup(v => v.HasRelevantChanges(_instanceDataAccessor, "Task_1", expectedChanges))
                .ReturnsAsync(hasRelevantChanges.Value);
        }

        if (issues is not null)
        {
            mock.Setup(v => v.Validate(_instanceDataAccessor, "Task_1", expectedLanguage)).ReturnsAsync(issues);
        }

        mock.SetupGet(v => v.NoIncrementalValidation).Returns(noIncrementalValidation);

        _services.AddSingleton(mock.Object);
        return mock;
    }

    [Fact]
    public async Task ValidateInstanceAtTask_WithNoData_ShouldReturnNoIssues()
    {
        // Arrange

        // Act
        var validationService = _serviceProvider.Value.GetRequiredService<IValidationService>();
        var result = await validationService.ValidateInstanceAtTask(_instanceDataAccessor, "Task_1", null, null, null);

        // Assert
        Assert.Empty(result);
        var telemetry = _serviceProvider.Value.GetRequiredService<TelemetrySink>();
        await Verify(telemetry.GetSnapshot());
    }

    [Fact]
    public async Task ValidateIncrementalFormData_WithNoData_ShouldReturnNoIssues()
    {
        var validationService = _serviceProvider.Value.GetRequiredService<IValidationService>();

        var changes = new DataElementChanges([]);
        var result = await validationService.ValidateIncrementalFormData(
            _instanceDataAccessor,
            "Task_1",
            changes,
            null,
            null
        );

        Assert.Empty(result);
        var telemetry = _serviceProvider.Value.GetRequiredService<TelemetrySink>();
        await Verify(telemetry.GetSnapshot());
    }

    [Fact]
    public async Task ValidateIncrementalFormData_WithIgnoredValidators_ShouldRunOnlyNonIgnoredValidators()
    {
        var changes = new DataElementChanges([]);
        var issues = new List<ValidationIssue>();

        RegisterValidatorMock("IgnoredValidator"); // Throws error if changes or validation is called
        RegisterValidatorMock("Validator", hasRelevantChanges: true, changes, issues);

        var validationService = _serviceProvider.Value.GetRequiredService<IValidationService>();
        var result = await validationService.ValidateIncrementalFormData(
            _instanceDataAccessor,
            "Task_1",
            changes,
            new List<string> { "IgnoredValidator" },
            null
        );
        result.Should().ContainSingle(p => p.Source == "Validator").Which.Issues.Should().BeEmpty();
    }

    [Fact]
    public async Task ValidateInstanceAtTask_WithIgnoredValidators_ShouldRunOnlyNonIgnoredValidators()
    {
        var language = "esperanto";
        var issue = new ValidationIssue()
        {
            Severity = ValidationIssueSeverity.Error,
            Description = "Test error",
            Code = "TestCode",
        };

        RegisterValidatorMock(source: "IgnoredValidator");
        RegisterValidatorMock(
            source: "Validator",
            hasRelevantChanges: true,
            issues: [issue],
            expectedLanguage: language
        );

        var validationService = _serviceProvider.Value.GetRequiredService<IValidationService>();
        var result = await validationService.ValidateInstanceAtTask(
            _instanceDataAccessor,
            "Task_1",
            new List<string> { "IgnoredValidator" },
            null,
            language
        );
        var issueWithSource = result.Should().ContainSingle().Which;
        issueWithSource.Source.Should().Be("Validator");
        issueWithSource.Code.Should().Be(issue.Code);
        issueWithSource.Description.Should().Be(issue.Description);
        issueWithSource.Severity.Should().Be(issue.Severity);
        issueWithSource.DataElementId.Should().BeNull();
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task ValidateInstanceAtTask_WithDifferentValidators_ShouldIgnoreNonIncrementalValidatorsWhenSpecified(
        bool? onlyIncrementalValidators
    )
    {
        var incrementalMock = RegisterValidatorMock(
            source: "Validator",
            hasRelevantChanges: null,
            issues: [],
            noIncrementalValidation: false
        );
        var nonIncrementalMock = RegisterValidatorMock(
            source: "NonIncrementalValidator",
            hasRelevantChanges: null,
            issues: [],
            noIncrementalValidation: true
        );

        var validationService = _serviceProvider.Value.GetRequiredService<IValidationService>();
        var issues = await validationService.ValidateInstanceAtTask(
            _instanceDataAccessor,
            "Task_1",
            null,
            onlyIncrementalValidators,
            null
        );

        issues.Should().BeEmpty();

        switch (onlyIncrementalValidators)
        {
            case true:
                incrementalMock.Verify(v => v.Validate(_instanceDataAccessor, "Task_1", null), Times.Once);
                nonIncrementalMock.Verify(v => v.Validate(_instanceDataAccessor, "Task_1", null), Times.Never);
                break;
            case false:
                incrementalMock.Verify(v => v.Validate(_instanceDataAccessor, "Task_1", null), Times.Never);
                nonIncrementalMock.Verify(v => v.Validate(_instanceDataAccessor, "Task_1", null), Times.Once);
                break;
            case null:
                incrementalMock.Verify(v => v.Validate(_instanceDataAccessor, "Task_1", null), Times.Once);
                nonIncrementalMock.Verify(v => v.Validate(_instanceDataAccessor, "Task_1", null), Times.Once);
                break;
        }
    }

    private class GenericValidatorFake : GenericFormDataValidator<string>
    {
        private readonly IEnumerable<ValidationIssue> _issues;
        private readonly bool? _hasRelevantChanges;

        public GenericValidatorFake(
            string dataType,
            IEnumerable<ValidationIssue> issues,
            bool? hasRelevantChanges = null
        )
            : base(dataType)
        {
            _issues = issues;
            _hasRelevantChanges = hasRelevantChanges;
        }

        protected override Task ValidateFormData(
            Instance instance,
            DataElement dataElement,
            string data,
            string? language
        )
        {
            foreach (var issue in _issues)
            {
                AddValidationIssue(issue);
            }

            return Task.CompletedTask;
        }

        protected override bool HasRelevantChanges(string current, string previous)
        {
            return _hasRelevantChanges ?? throw new Exception("Has relevant changes not set");
        }
    }

    [Fact]
    public async Task GenericFormDataValidator_serviceModelIsString_CallsValidatorFunctionForTask()
    {
        var valueToValidate = "valueToValidate";
        var defaultDataType = "default";
        var taskId = "Task_1";

        var dataElement = new DataElement { Id = Guid.NewGuid().ToString(), DataType = defaultDataType };
        _instanceDataAccessor.Add(dataElement, valueToValidate);

        List<ValidationIssue> validatorIssues =
        [
            new()
            {
                Severity = ValidationIssueSeverity.Error,
                Description = "Test error",
                Code = "TestCode",
            },
        ];

        var genericValidator = new GenericValidatorFake(defaultDataType, validatorIssues);
        _services.AddSingleton<IFormDataValidator>(genericValidator);

        var validationService = _serviceProvider.Value.GetRequiredService<IValidationService>();
        var issues = await validationService.ValidateInstanceAtTask(_instanceDataAccessor, taskId, null, null, null);
        var issue = issues.Should().ContainSingle().Which;
        issue.Source.Should().Be($"{genericValidator.GetType().FullName}-{defaultDataType}");
        issue.DataElementId.Should().Be(dataElement.Id);
        issue.Code.Should().Be("TestCode");

        var telemetry = _serviceProvider.Value.GetRequiredService<TelemetrySink>();

        var verifySettings = GetVerifySettings();
        await Verify(new { telemetry = telemetry.GetSnapshot(), issues = issues }, verifySettings);
    }

    [Fact]
    public async Task FormDataValidator_DataTypeNoAppLogic_IsNotCalled()
    {
        // Form DataValidators are connected to DataType,
        // and should only run for instances with that data type
        // on the task that has that data type

        var dataElement = new DataElement { Id = Guid.NewGuid().ToString(), DataType = "dataType" };

        var formDataValidatorNoAppLogicMock = new Mock<IFormDataValidator>(MockBehavior.Strict)
        {
            Name = "FormDataValidatorNoAppLogic",
        };
        formDataValidatorNoAppLogicMock
            .SetupGet(v => v.DataType)
            .Returns("dataTypeNoAppLogic")
            .Verifiable(Times.AtLeastOnce);
        formDataValidatorNoAppLogicMock
            .SetupGet(v => v.ValidationSource)
            .Returns("FormDataValidatorNoAppLogic")
            .Verifiable(Times.AtLeastOnce);
        _services.AddSingleton(formDataValidatorNoAppLogicMock.Object);
        _appMetadata.DataTypes.Add(new DataType { Id = "dataTypeNoAppLogic", TaskId = TaskId });

        var formDataValidatorWrongTaskMock = new Mock<IFormDataValidator>(MockBehavior.Strict)
        {
            Name = "FormDataValidatorWrongTask",
        };
        formDataValidatorWrongTaskMock
            .SetupGet(v => v.DataType)
            .Returns("dataTypeWrongTask")
            .Verifiable(Times.AtLeastOnce);
        formDataValidatorWrongTaskMock
            .SetupGet(v => v.ValidationSource)
            .Returns("FormDataValidatorWrongTask")
            .Verifiable(Times.AtLeastOnce);
        _services.AddSingleton(formDataValidatorWrongTaskMock.Object);
        _appMetadata.DataTypes.Add(
            new DataType
            {
                Id = "dataTypeWrongTask",
                TaskId = "wrongTask",
                AppLogic = new() { ClassRef = "System.String" },
            }
        );

        var formDataValidatorMock = new Mock<IFormDataValidator>(MockBehavior.Strict) { Name = "FormDataValidator" };
        formDataValidatorMock.SetupGet(v => v.DataType).Returns("dataType").Verifiable(Times.AtLeastOnce);
        formDataValidatorMock
            .SetupGet(v => v.ValidationSource)
            .Returns("FormDataValidator")
            .Verifiable(Times.AtLeastOnce);
        formDataValidatorMock
            .Setup(v => v.ValidateFormData(_instance, dataElement, "valueToValidate", null))
            .ReturnsAsync(
                new List<ValidationIssue>()
                {
                    new ValidationIssue()
                    {
                        Severity = ValidationIssueSeverity.Error,
                        Description = "Test error",
                        Code = "TestCode543",
                    },
                }
            );
        _services.AddSingleton(formDataValidatorMock.Object);
        _appMetadata.DataTypes.Add(
            new DataType
            {
                Id = "dataType",
                AppLogic = new() { ClassRef = "System.String" },
                TaskId = TaskId,
            }
        );

        // Ensure that we have data elements for all types
        _instanceDataAccessor.Add(dataElement, "valueToValidate");
        _instanceDataAccessor.Add(
            new DataElement() { Id = Guid.NewGuid().ToString(), DataType = "dataTypeNoAppLogic" },
            "valueToValidate"
        );
        _instanceDataAccessor.Add(
            new DataElement() { Id = Guid.NewGuid().ToString(), DataType = "dataTypeWrongTask" },
            "valueToValidate"
        );

        var validationService = _serviceProvider.Value.GetRequiredService<IValidationService>();
        var issues = await validationService.ValidateInstanceAtTask(_instanceDataAccessor, "Task_1", null, null, null);
        issues.Should().ContainSingle(i => i.Code == "TestCode543");

        formDataValidatorNoAppLogicMock.Verify();
        formDataValidatorMock.Verify();
    }

    [Fact]
    public async Task GenericFormDataValidator_serviceModelIsString_CallsValidatorFunctionForIncremental()
    {
        var valueToValidate = "valueToValidate";
        var defaultDataType = "default";
        var dataTypeNoValidation = "dataTypeToNotValidate";
        var taskId = "Task_1";
        _appMetadata.DataTypes.Add(
            new DataType
            {
                Id = defaultDataType,
                TaskId = taskId,
                AppLogic = new() { ClassRef = valueToValidate.GetType().FullName },
            }
        );
        var dataElement = new DataElement { Id = Guid.NewGuid().ToString(), DataType = defaultDataType };
        _instanceDataAccessor.Add(dataElement, valueToValidate);
        var dataElementNoValidation = new DataElement()
        {
            Id = Guid.NewGuid().ToString(),
            DataType = dataTypeNoValidation,
        };
        _instanceDataAccessor.Add(dataElementNoValidation, "valueToNotValidate");

        List<ValidationIssue> validatorIssues =
        [
            new()
            {
                Severity = ValidationIssueSeverity.Error,
                Description = "Test error",
                Code = "TestCode",
            },
        ];

        var changes = new DataElementChanges(
            [
                new FormDataChange()
                {
                    Type = ChangeType.Updated,
                    DataElement = dataElement,
                    DataType = _instanceDataAccessor.GetDataType(dataElement),
                    ContentType = "text/plain",
                    CurrentFormData = "currentValue",
                    PreviousFormData = "previousValue",
                    CurrentBinaryData = default,
                    PreviousBinaryData = default,
                },
                new FormDataChange()
                {
                    Type = ChangeType.Updated,
                    DataElement = dataElementNoValidation,
                    DataType = _instanceDataAccessor.GetDataType(dataElement),
                    ContentType = "text/plain",
                    CurrentFormData = "currentValue",
                    PreviousFormData = "previousValue",
                    CurrentBinaryData = null,
                    PreviousBinaryData = null,
                },
            ]
        );

        var genericValidator = new GenericValidatorFake(defaultDataType, validatorIssues, hasRelevantChanges: true);
        _services.AddSingleton<IFormDataValidator>(genericValidator);

        var validationService = _serviceProvider.Value.GetRequiredService<IValidationService>();
        var issues = await validationService.ValidateIncrementalFormData(
            _instanceDataAccessor,
            taskId,
            changes,
            null,
            null
        );
        issues.Should().HaveCount(1);

        var telemetry = _serviceProvider.Value.GetRequiredService<TelemetrySink>();

        var verifySettings = GetVerifySettings();
        await Verify(new { telemetry = telemetry.GetSnapshot(), issues = issues }, verifySettings);
    }

    private VerifySettings GetVerifySettings()
    {
        var verifySettings = new VerifySettings();
        int dataElementIndex = 0;
        _instance.Data.ForEach(
            (d) => verifySettings.AddNamedGuid(Guid.Parse(d.Id), $"DataElementId_{dataElementIndex++}")
        );
        return verifySettings;
    }

    public async Task DisposeAsync()
    {
        await _serviceProvider.Value.DisposeAsync();
    }
}
