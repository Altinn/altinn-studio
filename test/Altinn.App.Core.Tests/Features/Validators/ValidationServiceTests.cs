#nullable enable
using System.Text.Json.Serialization;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Validation;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace Altinn.App.Core.Tests.Features.Validators;

public class ValidationServiceTests
{
    private class MyModel
    {
        [JsonPropertyName("name")]
        public string? Name { get; set; }

        [JsonPropertyName("age")]
        public int? Age { get; set; }
    }

    private static readonly DataElement DefaultDataElement = new()
    {
        DataType = "MyType",
    };

    private static readonly DataType DefaultDataType = new()
    {
        Id = "MyType",
    };

    private readonly Mock<ILogger<ValidationService>> _loggerMock = new();
    private readonly Mock<IDataClient> _dataClientMock = new(MockBehavior.Strict);
    private readonly Mock<IAppModel> _appModelMock = new(MockBehavior.Strict);
    private readonly Mock<IAppMetadata> _appMetadataMock = new(MockBehavior.Strict);
    private readonly Mock<IFormDataValidator> _formDataValidatorMock = new(MockBehavior.Strict);
    private readonly ServiceCollection _serviceCollection = new();

    public ValidationServiceTests()
    {
        _serviceCollection.AddSingleton(_loggerMock.Object);
        _serviceCollection.AddSingleton(_dataClientMock.Object);
        _serviceCollection.AddSingleton<IValidationService, ValidationService>();
        _serviceCollection.AddSingleton(_appModelMock.Object);
        _serviceCollection.AddSingleton(_appMetadataMock.Object);
        _serviceCollection.AddSingleton(_formDataValidatorMock.Object);
        _formDataValidatorMock.Setup(v => v.DataType).Returns(DefaultDataType.Id);
        _formDataValidatorMock.Setup(v => v.ValidationSource).Returns("MyNameValidator");
    }

    [Fact]
    public async Task ValidateFormData_WithNoValidators_ReturnsNoErrors()
    {
        _serviceCollection.RemoveAll(typeof(IFormDataValidator));

        await using var serviceProvider = _serviceCollection.BuildServiceProvider();

        var validatorService = serviceProvider.GetRequiredService<IValidationService>();
        var data = new MyModel { Name = "Ola" };
        var result = await validatorService.ValidateFormData(new Instance(), DefaultDataElement, DefaultDataType, data);
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task ValidateFormData_WithMyNameValidator_ReturnsNoErrorsWhenNameIsOla()
    {
        _formDataValidatorMock.Setup(v => v.HasRelevantChanges(It.IsAny<object>(), It.IsAny<object>())).Returns(false);
        _formDataValidatorMock.Setup(v => v.ValidateFormData(It.IsAny<Instance>(), It.IsAny<DataElement>(), It.IsAny<object>())).ReturnsAsync((Instance instance, DataElement dataElement, object data) =>
        {
            if (data is MyModel model && model.Name != "Ola")
            {
                return new List<ValidationIssue> { { new() { Severity = ValidationIssueSeverity.Error, CustomTextKey = "NameNotOla" } } };
            }

            return new List<ValidationIssue>();
        });

        await using var serviceProvider = _serviceCollection.BuildServiceProvider();

        var validatorService = serviceProvider.GetRequiredService<IValidationService>();
        var data = new MyModel { Name = "Ola" };
        var result = await validatorService.ValidateFormData(new Instance(), DefaultDataElement, DefaultDataType, data);
        result.Should().ContainKey("MyNameValidator").WhoseValue.Should().HaveCount(0);
        result.Should().HaveCount(1);
    }

    [Fact]
    public async Task ValidateFormData_WithMyNameValidator_ReturnsErrorsWhenNameIsKari()
    {
        _formDataValidatorMock.Setup(v => v.ValidateFormData(It.IsAny<Instance>(), It.IsAny<DataElement>(), It.IsAny<object>())).ReturnsAsync((Instance instance, DataElement dataElement, object data) =>
        {
            if (data is MyModel model && model.Name != "Ola")
            {
                return new List<ValidationIssue> { { new() { Severity = ValidationIssueSeverity.Error, CustomTextKey = "NameNotOla" } } };
            }

            return new List<ValidationIssue>();
        });

        await using var serviceProvider = _serviceCollection.BuildServiceProvider();

        var validatorService = serviceProvider.GetRequiredService<IValidationService>();
        var data = new MyModel { Name = "Kari" };
        var result = await validatorService.ValidateFormData(new Instance(), DefaultDataElement, DefaultDataType, data);
        result.Should().ContainKey("MyNameValidator").WhoseValue.Should().ContainSingle().Which.CustomTextKey.Should().Be("NameNotOla");
        result.Should().HaveCount(1);
    }
}