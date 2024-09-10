using Altinn.App.Common.Tests;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Validation;
using Altinn.App.Core.Internal.App;
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

public class ValidationServiceTestsNew : IAsyncLifetime
{
    private const string Org = "ttd";
    private const string App = "app";
    private const string TaskId = "Task_1";

    private readonly ApplicationMetadata _appMetadata = new($"{Org}/{App}") { DataTypes = [] };

    private readonly Instance _instance =
        new()
        {
            AppId = $"{Org}/{App}",
            Org = Org,
            Data = []
        };

    private readonly Mock<IAppMetadata> _appMetadataMock = new(MockBehavior.Strict);
    private readonly InstanceDataAccessorFake _instanceDataAccessor;
    private readonly IServiceCollection _services = new ServiceCollection();
    private readonly Lazy<ServiceProvider> _serviceProvider;

    public ValidationServiceTestsNew(ITestOutputHelper output)
    {
        _instanceDataAccessor = new InstanceDataAccessorFake(_instance, _appMetadata, TaskId);
        _services.AddScoped<IValidationService, ValidationService>();
        _services.AddTelemetrySink();
        _services.AddFakeLoggingWithXunit(output);
        _services.AddScoped<IValidatorFactory, ValidatorFactory>();
        _services.AddSingleton(_appMetadataMock.Object);

        _appMetadataMock.Setup(am => am.GetApplicationMetadata()).ReturnsAsync(_appMetadata);
        _serviceProvider = new(() => _services.BuildServiceProvider());
    }

    public Task InitializeAsync()
    {
        return Task.CompletedTask;
    }

    private Mock<IValidator> RegistrerValidatorMock(
        string source,
        bool? hasRelevantChanges = null,
        List<DataElementChange>? expectedChanges = null,
        List<ValidationIssue>? issues = null,
        string? expectedLanguage = null
    )
    {
        var mock = new Mock<IValidator>(MockBehavior.Strict);
        mock.Setup(v => v.ValidationSource).Returns(source);
        if (hasRelevantChanges.HasValue && expectedChanges is not null)
        {
            mock.Setup(v => v.HasRelevantChanges(_instance, "Task_1", expectedChanges, _instanceDataAccessor))
                .ReturnsAsync(hasRelevantChanges.Value);
        }

        if (issues is not null)
        {
            mock.Setup(v => v.Validate(_instance, _instanceDataAccessor, "Task_1", expectedLanguage))
                .ReturnsAsync(issues);
        }

        _services.AddSingleton(mock.Object);
        return mock;
    }

    [Fact]
    public async Task ValidateInstanceAtTask_WithNoData_ShouldReturnNoIssues()
    {
        // Arrange

        // Act
        var validationService = _serviceProvider.Value.GetRequiredService<IValidationService>();
        var result = await validationService.ValidateInstanceAtTask(
            _instance,
            _instanceDataAccessor,
            "Task_1",
            null,
            null
        );

        // Assert
        Assert.Empty(result);
        var telemetry = _serviceProvider.Value.GetRequiredService<TelemetrySink>();
        await Verify(telemetry.GetSnapshot());
    }

    [Fact]
    public async Task ValidateIncrementalFormData_WithNoData_ShouldReturnNoIssues()
    {
        var validationService = _serviceProvider.Value.GetRequiredService<IValidationService>();

        var changes = new List<DataElementChange>();
        var result = await validationService.ValidateIncrementalFormData(
            _instance,
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
        var changes = new List<DataElementChange>();
        var issues = new List<ValidationIssue>();

        RegistrerValidatorMock("IgnoredValidator"); // Throws error if changes or validation is called
        RegistrerValidatorMock("Validator", hasRelevantChanges: true, changes, issues);

        var validationService = _serviceProvider.Value.GetRequiredService<IValidationService>();
        var result = await validationService.ValidateIncrementalFormData(
            _instance,
            _instanceDataAccessor,
            "Task_1",
            changes,
            new List<string> { "IgnoredValidator" },
            null
        );
        result.Should().ContainKey("Validator").WhoseValue.Should().BeEmpty();
    }

    [Fact]
    public async Task ValidateInstanceAtTask_WithIgnoredValidators_ShouldRunOnlyNonIgnoredValidators()
    {
        var language = "esperanto";
        var issue = new ValidationIssue()
        {
            Severity = ValidationIssueSeverity.Error,
            Description = "Test error",
            Code = "TestCode"
        };

        RegistrerValidatorMock(source: "IgnoredValidator");
        RegistrerValidatorMock(
            source: "Validator",
            hasRelevantChanges: true,
            issues: [issue],
            expectedLanguage: language
        );

        var validationService = _serviceProvider.Value.GetRequiredService<IValidationService>();
        var result = await validationService.ValidateInstanceAtTask(
            _instance,
            _instanceDataAccessor,
            "Task_1",
            new List<string> { "IgnoredValidator" },
            language
        );
        var issueWithSource = result.Should().ContainSingle().Which;
        issueWithSource.Source.Should().Be("Validator");
        issueWithSource.Code.Should().Be(issue.Code);
        issueWithSource.Description.Should().Be(issue.Description);
        issueWithSource.Severity.Should().Be(issue.Severity);
        issueWithSource.DataElementId.Should().BeNull();
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
                Code = "TestCode"
            }
        ];

        var genericValidator = new GenericValidatorFake(defaultDataType, validatorIssues);
        _services.AddSingleton<IFormDataValidator>(genericValidator);

        var validationService = _serviceProvider.Value.GetRequiredService<IValidationService>();
        var issues = await validationService.ValidateInstanceAtTask(
            _instance,
            _instanceDataAccessor,
            taskId,
            null,
            null
        );
        var issue = issues.Should().ContainSingle().Which;
        issue.Source.Should().Be($"{genericValidator.GetType().FullName}-{defaultDataType}");
        issue.DataElementId.Should().Be(dataElement.Id);
        issue.Code.Should().Be("TestCode");

        var telemetry = _serviceProvider.Value.GetRequiredService<TelemetrySink>();

        var verifySettings = GetVerifySettings();
        await Verify(new { telemetry = telemetry.GetSnapshot(), issues = issues }, verifySettings);
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
                AppLogic = new() { ClassRef = valueToValidate.GetType().FullName }
            }
        );
        var dataElement = new DataElement { Id = Guid.NewGuid().ToString(), DataType = defaultDataType };
        _instanceDataAccessor.Add(dataElement, valueToValidate);
        var dataElementNoValidation = new DataElement()
        {
            Id = Guid.NewGuid().ToString(),
            DataType = dataTypeNoValidation
        };
        _instanceDataAccessor.Add(dataElementNoValidation, "valueToNotValidate");

        List<ValidationIssue> validatorIssues =
        [
            new()
            {
                Severity = ValidationIssueSeverity.Error,
                Description = "Test error",
                Code = "TestCode"
            }
        ];

        List<DataElementChange> changes =
            new()
            {
                new DataElementChange()
                {
                    DataElement = dataElement,
                    CurrentValue = "currentValue",
                    PreviousValue = "previousValue"
                },
                new DataElementChange()
                {
                    DataElement = dataElementNoValidation,
                    CurrentValue = "currentValue",
                    PreviousValue = "previousValue"
                }
            };

        var genericValidator = new GenericValidatorFake(defaultDataType, validatorIssues, hasRelevantChanges: true);
        _services.AddSingleton<IFormDataValidator>(genericValidator);

        var validationService = _serviceProvider.Value.GetRequiredService<IValidationService>();
        var issues = await validationService.ValidateIncrementalFormData(
            _instance,
            _instanceDataAccessor,
            taskId,
            changes,
            null,
            null
        );
        var issue = issues.Should().ContainSingle().Which;

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
