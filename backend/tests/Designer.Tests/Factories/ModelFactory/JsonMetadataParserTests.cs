using Designer.Tests.Factories.ModelFactory.BaseClasses;
using FluentAssertions;
using Xunit;

namespace Designer.Tests.Factories.ModelFactory
{
    public class JsonMetadataParserTests : CsharpModelConversionTestsBase<JsonMetadataParserTests>
    {
        [Fact]
        public void CreateModelFromMetadata_InputModelWithRestrictionMinimumAndMaximum_GenerateDataAnnotationWithRangeFromMinToMax()
        {
            Given.That.MetamodelLoaded(
                    "Model/Metadata/restriction-total-digits.metadata.json")
                .When.CSharpClassesCreatedFromMetamodel()
                .Then.CSharpClasses.Should().NotBeNull();
            And.CSharpClasses.Should().Contain("[Range(-7.766279631452242E+18, 7.766279631452242E+18)]");
        }

        [Fact]
        public void CreateModelFromMetadata_InputModelWithRestrictionMinLengthAndMaxLength_GenerateDataAnnotationWithMinLengthAndMaxLengthAttributes()
        {
            Given.That.MetamodelLoaded(
                    "Model/Metadata/restriction-total-digits.metadata.json")
                .When.CSharpClassesCreatedFromMetamodel()
                .Then.CSharpClasses.Should().NotBeNull();
            And.CSharpClasses.Should().Contain("[MinLength(1)]");
            And.CSharpClasses.Should().Contain("[MaxLength(20)]");
        }

        [Fact]
        public void CreateModelFromMetadata_InputModelSpecifiedModelName_GenerateDataAnnotationForRoomElement()
        {
            Given.That.MetamodelLoaded(
                    "Model/Metadata/RA-0678_M.metadata.json")
                .When.CSharpClassesCreatedFromMetamodel()
                .Then.CSharpClasses.Should().NotBeNull();
            And.CSharpClasses.Should().Contain("[XmlRoot(ElementName=\"melding\")]");
        }

        [Fact]
        public void CreateModelFromMetadata_StringArrayShouldUseNativeType()
        {
            Given.That.MetamodelLoaded(
                    "Model/Metadata/SimpleStringArray.metadata.json")
                .When.CSharpClassesCreatedFromMetamodel()
                .Then.CSharpClasses.Should().NotBeNull();
            And.CSharpClasses.Should().Contain("List<string>");
            And.CSharpClasses.Should().NotContain("List<String>");
            And.CSharpClasses.Should().NotContain("public class String");
        }

        [Fact]
        public void CreateModelFromMetadata_TargetNamespaceShouldBeCarriedOverToClass()
        {
            Given.That.MetamodelLoaded(
                    "Model/Metadata/SeresBasicSchemaWithTargetNamespace.metadata.json")
                .When.CSharpClassesCreatedFromMetamodel()
                .Then.CSharpClasses.Should().NotBeNull();
            And.CSharpClasses.Should().MatchRegex("\\[XmlRoot\\(.*Namespace=\"urn:no:altinn:message\"\\)\\]");
        }
    }
}
