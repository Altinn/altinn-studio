#nullable disable
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Validation.Default;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Validation;
using Altinn.App.Core.Tests.LayoutExpressions.TestUtilities;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Moq;

namespace Altinn.App.Core.Tests.Features.Validators.Default;

public class LegacyIValidationFormDataTests
{
    private readonly LegacyIInstanceValidatorFormDataValidator _validator;
    private readonly Mock<IInstanceValidator> _instanceValidator = new(MockBehavior.Strict);
    private readonly InstanceDataAccessorFake _instanceDataAccessor;

    private readonly ApplicationMetadata _applicationMetadata = new ApplicationMetadata("ttd/test")
    {
        Title = new LanguageString() { { "nb", "test" } },
        DataTypes = new List<DataType>()
        {
            new DataType()
            {
                Id = "test",
                TaskId = "Task_1",
                AppLogic = new() { ClassRef = typeof(TestModel).FullName },
            },
        },
    };

    private readonly Guid _dataId = Guid.NewGuid();
    private readonly DataElement _dataElement;
    private readonly Instance _instance;

    public LegacyIValidationFormDataTests()
    {
        var generalSettings = new GeneralSettings();
        _validator = new LegacyIInstanceValidatorFormDataValidator(
            Microsoft.Extensions.Options.Options.Create(generalSettings),
            _instanceValidator.Object
        );

        _dataElement = new DataElement() { DataType = "test", Id = _dataId.ToString() };
        _instance = new Instance()
        {
            AppId = "test",
            Org = "test",
            InstanceOwner = new InstanceOwner() { PartyId = "1" },
            Data = [_dataElement],
        };
        _instanceDataAccessor = new InstanceDataAccessorFake(_instance, _applicationMetadata, "Task_1", "test");
    }

    [Fact]
    public async Task ValidateFormData_WithErrors()
    {
        // Arrange
        var data = new TestModel();

        _instanceValidator
            .Setup(iv => iv.ValidateData(It.IsAny<TestModel>(), It.IsAny<ModelStateDictionary>()))
            .Returns(
                (TestModel _, ModelStateDictionary modelState) =>
                {
                    modelState.AddModelError("test", "test");
                    modelState.AddModelError("ddd", "*FIXED*test");
                    return Task.CompletedTask;
                }
            )
            .Verifiable(Times.Once);

        _instanceDataAccessor.Add(_dataElement, data);

        // Act
        var result = await _validator.Validate(_instanceDataAccessor, "Task_1", null);

        // Assert
        result
            .Should()
            .BeEquivalentTo(
                JsonSerializer.Deserialize<List<ValidationIssue>>(
                    $$"""
                    [
                        {
                            "severity": 4,
                            "instanceId": null,
                            "dataElementId": "{{_dataId}}",
                            "field": "ddd",
                            "code": "test",
                            "description": "test",
                            "customTextKey": null
                        },
                        {
                            "severity": 1,
                            "instanceId": null,
                            "dataElementId": "{{_dataId}}",
                            "field": "test",
                            "code": "test",
                            "description": "test",
                            "customTextKey": null
                        }
                    ]
                    """
                )
            );

        _instanceValidator.Verify();
    }

    private class TestModel
    {
        [JsonPropertyName("test")]
        public string Test { get; set; }

        public int IntegerWithout { get; set; }

        [JsonPropertyName("child")]
        public TestModel Child { get; set; }

        [JsonPropertyName("children")]
        public List<TestModel> TestList { get; set; }
    }

    [Theory]
    [InlineData("test", "test", "test with small case")]
    [InlineData("Test", "test", "test with capital case gets rewritten")]
    [InlineData("NotModelMatch", "NotModelMatch", "Error that does not mach model is kept as is")]
    [InlineData(
        "Child.TestList[2].child",
        "child.children[2].child",
        "TestList is renamed to children because of JsonPropertyName"
    )]
    [InlineData("test.children.child", "test.children.child", "valid JsonPropertyName based path is kept as is")]
    public async Task ValidateErrorAndMappingWithCustomModel(string errorKey, string field, string errorMessage)
    {
        // Arrange
        var data = new TestModel();

        var instanceValidator = _instanceValidator;
        instanceValidator
            .Setup(iv => iv.ValidateData(It.IsAny<object>(), It.IsAny<ModelStateDictionary>()))
            .Returns(
                (object _, ModelStateDictionary modelState) =>
                {
                    modelState.AddModelError(errorKey, errorMessage);
                    modelState.AddModelError(errorKey, "*FIXED*" + errorMessage + " Fixed");
                    return Task.CompletedTask;
                }
            )
            .Verifiable(Times.Once);
        _instanceDataAccessor.Add(_dataElement, data);

        // Act
        var result = await _validator.Validate(_instanceDataAccessor, "Task_1", null);

        // Assert
        result.Should().HaveCount(2);
        var errorIssue = result.Should().ContainSingle(i => i.Severity == ValidationIssueSeverity.Error).Which;
        errorIssue.Field.Should().Be(field);
        errorIssue.Severity.Should().Be(ValidationIssueSeverity.Error);
        errorIssue.Description.Should().Be(errorMessage);

        var fixedIssue = result.Should().ContainSingle(i => i.Severity == ValidationIssueSeverity.Fixed).Which;
        fixedIssue.Field.Should().Be(field);
        fixedIssue.Severity.Should().Be(ValidationIssueSeverity.Fixed);
        fixedIssue.Description.Should().Be(errorMessage + " Fixed");

        _instanceValidator.Verify();
    }
}
