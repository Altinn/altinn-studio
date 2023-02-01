using DataModeling.Tests.BaseClasses;
using FluentAssertions;
using Xunit;

namespace DataModeling.Tests
{
    public class JsonMetadataParserTests : CsharpModelConversionTestsBase<JsonMetadataParserTests>
    {
        [Fact]
        public void CreateModelFromMetadata_InputModelWithRestrictionMinimumAndMaximum_GenerateDataAnnotationWithRangeFromMinToMax()
        {
            Given.That.ModelMetadataLoaded(
                    "Model/Metadata/restriction-total-digits.json")
                .When.ModelMetadataConvertedToCsharpClass()
                .Then.CSharpClasses.Should().NotBeNull();
            And.CSharpClasses.Should().Contain("[Range(-7.766279631452242E+18, 7.766279631452242E+18)]");
        }

        [Fact]
        public void CreateModelFromMetadata_InputModelWithRestrictionMinLengthAndMaxLength_GenerateDataAnnotationWithMinLengthAndMaxLengthAttributes()
        {
            Given.That.ModelMetadataLoaded(
                    "Model/Metadata/restriction-total-digits.json")
                .When.ModelMetadataConvertedToCsharpClass()
                .Then.CSharpClasses.Should().NotBeNull();
            And.CSharpClasses.Should().Contain("[MinLength(1)]");
            And.CSharpClasses.Should().Contain("[MaxLength(20)]");
        }

        [Fact]
        public void CreateModelFromMetadata_InputModelSpecifiedModelName_GenerateDataAnnotationForRoomElement()
        {
            Given.That.ModelMetadataLoaded(
                    "Model/Metadata/RA-0678_M.json")
                .When.ModelMetadataConvertedToCsharpClass()
                .Then.CSharpClasses.Should().NotBeNull();
            And.CSharpClasses.Should().Contain("[XmlRoot(ElementName=\"melding\")]");
        }

        [Fact]
        public void CreateModelFromMetadata_StringArrayShouldUseNativeType()
        {
            Given.That.ModelMetadataLoaded(
                    "Model/Metadata/SimpleStringArray.json")
                .When.ModelMetadataConvertedToCsharpClass()
                .Then.CSharpClasses.Should().NotBeNull();
            And.CSharpClasses.Should().Contain("List<string>");
            And.CSharpClasses.Should().NotContain("List<String>");
            And.CSharpClasses.Should().NotContain("public class String");
        }

        [Fact]
        public void CreateModelFromMetadata_TargetNamespaceShouldBeCarriedOverToClass()
        {
            Given.That.ModelMetadataLoaded(
                    "Model/Metadata/SeresBasicSchemaWithTargetNamespace.json")
                .When.ModelMetadataConvertedToCsharpClass()
                .Then.CSharpClasses.Should().NotBeNull();
            And.CSharpClasses.Should().MatchRegex("\\[XmlRoot\\(.*Namespace=\"urn:no:altinn:message\"\\)\\]");
        }
    }
}
