using System;
using System.IO;
using System.Reflection;
using System.Text.RegularExpressions;
using Altinn.Studio.Designer.Factories.ModelFactory;
using Altinn.Studio.Designer.ModelMetadatalModels;
using FluentAssertions;
using FluentAssertions.Primitives;
using Manatee.Json;
using Manatee.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Designer.Tests.Factories.ModelFactory
{
    public class JsonMetadataParserTests: FluentTestsBase<JsonMetadataParserTests>
    {
        private ModelMetadata _modelMetadata;
        private string _modelClasses;

        [Fact]
        public void CreateModelFromMetadata_InputModelWithRestrictionMinimumAndMaximum_GenerateDataAnnotationWithRangeFromMinToMax()
        {
            Given.That.ModelMetaDataIsLoaded(
                    "Designer.Tests._TestData.Model.Metadata.restriction-total-digits.metadata.json")
                .When.ClassesParsedFromMetadata()
                .Then.ParsedClassesShouldNotBeNull()
                .And.ParsedClassesShouldContain("[Range(-7.766279631452242E+18, 7.766279631452242E+18)]");
        }

        [Fact]
        public void CreateModelFromMetadata_InputModelWithRestrictionMinLengthAndMaxLength_GenerateDataAnnotationWithMinLengthAndMaxLengthAttributes()
        {
            Given.That.ModelMetaDataIsLoaded(
                    "Designer.Tests._TestData.Model.Metadata.restriction-total-digits.metadata.json")
                .When.ClassesParsedFromMetadata()
                .Then.ParsedClassesShouldNotBeNull()
                .And.ParsedClassesShouldContain("[MinLength(1)]")
                .And.ParsedClassesShouldContain("[MaxLength(20)]");
        }

        [Fact]
        public void CreateModelFromMetadata_InputModelSpecifiedModelName_GenerateDataAnnotationForRoomElement()
        {
            Given.That.ModelMetaDataIsLoaded(
                    "Designer.Tests._TestData.Model.Metadata.RA-0678_M.metadata.json")
                .When.ClassesParsedFromMetadata()
                .Then.ParsedClassesShouldNotBeNull()
                .And.ParsedClassesShouldContain("[XmlRoot(ElementName=\"melding\")]");
        }

        [Fact]
        public void CreateModelFromMetadata_StringArrayShouldUseNativeType()
        {
            Given.That.ModelMetaDataIsLoaded(
                    "Designer.Tests._TestData.Model.Metadata.SimpleStringArray.metadata.json")
                .When.ClassesParsedFromMetadata()
                .Then.ParsedClassesShouldNotBeNull()
                .And.ParsedClassesShouldContain("List<string>")
                .But.ParsedClassesShouldNotContain("List<String>")
                .And.ParsedClassesShouldNotContain("public class String");
        }

        [Fact]
        public void CreateModelFromMetadata_TargetNamespaceShouldBeCarriedOverToClass()
        {
            Given.That.ModelMetaDataIsLoaded(
                    "Designer.Tests._TestData.Model.Metadata.SeresBasicSchemaWithTargetNamespace.metadata.json")
                .When.ClassesParsedFromMetadata()
                .Then.ParsedClassesShouldNotBeNull()
                .And.ParsedClassesShouldMatchRegex("\\[XmlRoot\\(.*Namespace=\"urn:no:altinn:message\"\\)\\]");
        }

        private ModelMetadata LoadTestData(string resourceName)
        {
            Assembly assembly = typeof(JsonMetadataParserTests).GetTypeInfo().Assembly;
            using Stream resource = assembly.GetManifestResourceStream(resourceName);

            if (resource == null)
            {
                throw new InvalidOperationException("Unable to find test data embedded in the test assembly.");
            }

            using StreamReader streamReader = new StreamReader(resource);
            JsonValue jsonValue = JsonValue.Parse(streamReader);
            return new JsonSerializer().Deserialize<ModelMetadata>(jsonValue);
        }

        // Fluent methods
        private JsonMetadataParserTests ModelMetaDataIsLoaded(string resourceName)
        {
            _modelMetadata = LoadTestData(resourceName);
            return this;
        }

        private JsonMetadataParserTests ClassesParsedFromMetadata()
        {
            var target = new JsonMetadataParser();
            _modelClasses = target.CreateModelFromMetadata(_modelMetadata);
            return this;
        }

        // Assertion methods
        private JsonMetadataParserTests ParsedClassesShouldNotBeNull()
        {
            _modelClasses.Should().NotBeNull();
            return this;
        }

        private JsonMetadataParserTests ParsedClassesShouldContain(string matchString)
        {
            _modelClasses.Should().Contain(matchString);
            return this;
        }

        private JsonMetadataParserTests ParsedClassesShouldNotContain(string matchString)
        {
            _modelClasses.Should().NotContain(matchString);
            return this;
        }

        private JsonMetadataParserTests ParsedClassesShouldMatchRegex(string regexString)
        {
            _modelClasses.Should().MatchRegex(regexString);
            return this;
        }
    }
}
