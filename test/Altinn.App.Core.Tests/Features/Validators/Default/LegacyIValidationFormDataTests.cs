using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Validation.Default;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace Altinn.App.Core.Tests.Features.Validators.Default
{
    public class LegacyIValidationFormDataTests
    {
        private readonly LegacyIInstanceValidatorFormDataValidator _validator;
        private readonly Mock<IInstanceValidator> _instanceValidator = new();

        public LegacyIValidationFormDataTests()
        {
            var generalSettings = new GeneralSettings();
            _validator =
                new LegacyIInstanceValidatorFormDataValidator(Options.Create(generalSettings), _instanceValidator.Object);
        }

        [Fact]
        public async Task ValidateFormData_NoErrors()
        {
            // Arrange
            var data = new object();

            var validator = new LegacyIInstanceValidatorFormDataValidator(Options.Create(new GeneralSettings()), null);
            validator.HasRelevantChanges(data, data).Should().BeFalse();

            // Act
            var result = await validator.ValidateFormData(new Instance(), new DataElement(), data);

            // Assert
            Assert.Empty(result);
        }

        [Fact]
        public async Task ValidateFormData_WithErrors()
        {
            // Arrange
            var data = new object();

            _instanceValidator
                .Setup(iv => iv.ValidateData(It.IsAny<object>(), It.IsAny<ModelStateDictionary>()))
                .Callback((object _, ModelStateDictionary modelState) =>
                {
                    modelState.AddModelError("test", "test");
                    modelState.AddModelError("ddd", "*FIXED*test");
                });

            // Act
            var result = await _validator.ValidateFormData(new Instance(), new DataElement(), data);

            // Assert
            result.Should().BeEquivalentTo(
                JsonSerializer.Deserialize<List<ValidationIssue>>("""
                [
                    {
                        "severity": 4,
                        "instanceId": null,
                        "dataElementId": null,
                        "field": "ddd",
                        "code": "test",
                        "description": "test",
                        "source": "Custom",
                        "customTextKey": null
                    },
                    {
                        "severity": 1,
                        "instanceId": null,
                        "dataElementId": null,
                        "field": "test",
                        "code": "test",
                        "description": "test",
                        "source": "Custom",
                        "customTextKey": null
                    }
                ]
                """));
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
        [InlineData("Child.TestList[2].child", "child.children[2].child", "TestList is renamed to children because of JsonPropertyName")]
        [InlineData("test.children.child", "test.children.child", "valid JsonPropertyName based path is kept as is")]
        public async Task ValidateErrorAndMappingWithCustomModel(string errorKey, string field, string errorMessage)
        {
            // Arrange
            var data = new TestModel();

            _instanceValidator
                .Setup(iv => iv.ValidateData(It.IsAny<object>(), It.IsAny<ModelStateDictionary>()))
                .Callback((object _, ModelStateDictionary modelState) =>
                {
                    modelState.AddModelError(errorKey, errorMessage);
                    modelState.AddModelError(errorKey, "*FIXED*" + errorMessage + " Fixed");
                });

            // Act
            var result = await _validator.ValidateFormData(new Instance(), new DataElement(), data);

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
        }
    }
}