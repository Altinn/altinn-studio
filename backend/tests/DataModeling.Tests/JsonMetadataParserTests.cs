using DataModeling.Tests.BaseClasses;
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
                .When.ModelMetadataConvertedToCsharpClass();

            Assert.NotNull(CSharpClasses);
            Assert.Contains("[Range(-7.766279631452242E+18, 7.766279631452242E+18)]", CSharpClasses);
        }

        [Fact]
        public void CreateModelFromMetadata_InputModelWithRestrictionMinLengthAndMaxLength_GenerateDataAnnotationWithMinLengthAndMaxLengthAttributes()
        {
            Given.That.ModelMetadataLoaded(
                    "Model/Metadata/restriction-total-digits.json")
                .When.ModelMetadataConvertedToCsharpClass();

            Assert.NotNull(CSharpClasses);

            Assert.Contains("[MinLength(1)]", CSharpClasses);
            Assert.Contains("[MaxLength(20)]", CSharpClasses);
        }

        [Fact]
        public void CreateModelFromMetadata_InputModelSpecifiedModelName_GenerateDataAnnotationForRoomElement()
        {
            Given.That.ModelMetadataLoaded(
                    "Model/Metadata/RA-0678_M.json")
                .When.ModelMetadataConvertedToCsharpClass();

            Assert.NotNull(CSharpClasses);

            Assert.Contains("[XmlRoot(ElementName=\"melding\")]", CSharpClasses);
        }

        [Fact]
        public void CreateModelFromMetadata_StringArrayShouldUseNativeType()
        {
            Given.That.ModelMetadataLoaded(
                    "Model/Metadata/SimpleStringArray.json")
                .When.ModelMetadataConvertedToCsharpClass();

            Assert.NotNull(CSharpClasses);

            Assert.Contains("List<string>", CSharpClasses);
            Assert.DoesNotContain("List<String>", CSharpClasses);
            Assert.DoesNotContain("public class String", CSharpClasses);
        }

        [Fact]
        public void CreateModelFromMetadata_TargetNamespaceShouldBeCarriedOverToClass()
        {
            Given.That.ModelMetadataLoaded(
                    "Model/Metadata/SeresBasicSchemaWithTargetNamespace.json")
                .When.ModelMetadataConvertedToCsharpClass();

            Assert.NotNull(CSharpClasses);

            Assert.Matches("\\[XmlRoot\\(.*Namespace=\"urn:no:altinn:message\"\\)\\]", CSharpClasses);

        }
    }
}
