using System;
using Altinn.Studio.DataModeling.Validator.Json;
using DataModeling.Tests.BaseClasses;
using DataModeling.Tests.TestDataClasses;
using FluentAssertions;
using Json.Pointer;
using Xunit;

namespace DataModeling.Tests
{
    public class AltinnJsonSchemaValidationTests : SchemaConversionTestsBase<AltinnJsonSchemaValidationTests>
    {
        private JsonSchemaValidationResult ValidationResult { get; set; }

        [Theory]
        [MemberData(nameof(AltinnJsonSchemaValidationTestData.ValidSchemas), MemberType = typeof(AltinnJsonSchemaValidationTestData))]
        public void ValidJsonSchema_ShouldNotHave_ValidationIssues(string jsonSchemaPath)
        {
            When.JsonSchemaLoaded(jsonSchemaPath)
                .And.LoadedJsonSchemaValidated()
                .Then.ValidationResult.IsValid.Should().BeTrue();
        }

        [Theory]
        [MemberData(nameof(AltinnJsonSchemaValidationTestData.InvalidSchemas), MemberType = typeof(AltinnJsonSchemaValidationTestData))]
        public void InvalidJsonSchema_ShouldHave_ValidationIssues(string jsonSchemaPath, params Tuple<string, string>[] expectedValidationIssues)
        {
            When.JsonSchemaLoaded(jsonSchemaPath)
                .And.LoadedJsonSchemaValidated()
                .Then.ValidationResult.IsValid.Should().BeFalse();

            And.ValidationResult.ValidationIssues.Should().HaveCount(expectedValidationIssues.Length);

            foreach ((string expectedPointer, string expectedCode) in expectedValidationIssues)
            {
                ValidationResult.ValidationIssues.Should().Contain(x => x.ErrorCode == expectedCode && JsonPointer.Parse(x.IssuePointer) == JsonPointer.Parse(expectedPointer));
            }
        }

        private AltinnJsonSchemaValidationTests LoadedJsonSchemaValidated()
        {
            var validator = new AltinnJsonSchemaValidator();
            ValidationResult = validator.Validate(SerializeJsonSchema(LoadedJsonSchema));
            return this;
        }
    }
}
