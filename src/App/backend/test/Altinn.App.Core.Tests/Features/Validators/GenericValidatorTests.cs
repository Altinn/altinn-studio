using System.Text.Json.Serialization;
using Altinn.App.Core.Features.Validation;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;

namespace Altinn.App.Core.Tests.Features.Validators;

public class GenericValidatorTests
{
    private class MyModel
    {
        [JsonPropertyName("name")]
        public string? Name { get; set; }

        [JsonPropertyName("age")]
        public int? Age { get; set; }

        [JsonPropertyName("children")]
        public List<MyModel>? Children { get; set; }
    }

    private class TestValidator : GenericFormDataValidator<MyModel>
    {
        public TestValidator()
            : base("MyType") { }

        protected override bool HasRelevantChanges(MyModel current, MyModel previous)
        {
            throw new NotImplementedException();
        }

        protected override Task ValidateFormData(
            Instance instance,
            DataElement dataElement,
            MyModel data,
            string? language
        )
        {
            AddValidationIssue(
                new ValidationIssue() { Severity = ValidationIssueSeverity.Informational, Description = "Test info" }
            );

            CreateValidationIssue(c => c.Name, "Test warning", severity: ValidationIssueSeverity.Warning);
            var childIndex = 4;
            CreateValidationIssue(
                c => c.Children![childIndex].Children![0].Name,
                "childrenError",
                severity: ValidationIssueSeverity.Error
            );

            return Task.CompletedTask;
        }
    }

    [Fact]
    public async Task VerifyTestValidator()
    {
        var testValidator = new TestValidator();
        var instance = new Instance();
        var dataElement = new DataElement();
        var data = new MyModel();

        var validationIssues = await testValidator.ValidateFormData(instance, dataElement, data, null);
        validationIssues.Should().HaveCount(3);

        var info = validationIssues
            .Should()
            .ContainSingle(c => c.Severity == ValidationIssueSeverity.Informational)
            .Which;
        info.Description.Should().Be("Test info");

        var warning = validationIssues.Should().ContainSingle(c => c.Severity == ValidationIssueSeverity.Warning).Which;
        warning.CustomTextKey.Should().Be("Test warning");
        warning.Field.Should().Be("name");

        var error = validationIssues.Should().ContainSingle(c => c.Severity == ValidationIssueSeverity.Error).Which;
        error.CustomTextKey.Should().Be("childrenError");
        error.Field.Should().Be("children[4].children[0].name");
    }
}
