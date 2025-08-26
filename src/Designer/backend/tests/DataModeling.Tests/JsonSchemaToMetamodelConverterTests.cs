using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.Studio.DataModeling.Metamodel;
using DataModeling.Tests.BaseClasses;
using Designer.Tests.Assertions;
using SharedResources.Tests;
using Xunit;

namespace DataModeling.Tests
{
    public class JsonSchemaToMetamodelConverterTests : CsharpModelConversionTestsBase<JsonSchemaToMetamodelConverterTests>
    {
        private ModelMetadata ExpectedModelMetadata { get; set; }

        [Theory]
        [InlineData("Seres/HvemErHvem.xsd", "Model/Metadata/HvemErHvem.json")]
        [InlineData("Seres/SeresBasicSchema.xsd", "Model/Metadata/SeresBasicSchema.json")]
        [InlineData("Seres/schema_5259_1_forms_9999_50000.xsd", "Model/Metadata/schema_5259_1_forms_9999_50000.json")]
        [InlineData("Seres/schema_5064_1_forms_5793_42882.xsd", "Model/Metadata/schema_5064_1_forms_5793_42882.json")]
        [InlineData("Seres/schema_5222_2_forms_5909_43507.xsd", "Model/Metadata/schema_5222_2_forms_5909_43507.json")]
        [InlineData("Seres/schema_4830_4000_forms_5524_41951.xsd", "Model/Metadata/schema_4830_4000_forms_5524_41951.json")]
        [InlineData("Seres/schema_4582_2000_forms_5244_42360.xsd", "Model/Metadata/schema_4582_2000_forms_5244_42360.json")]
        [InlineData("Seres/schema_4741_4280_forms_5273_41269.xsd", "Model/Metadata/schema_4741_4280_forms_5273_41269.json")]
        [InlineData("Seres/SchemaWithTargetNamespace.xsd", "Model/Metadata/SchemaWithTargetNamespace.json")]
        public void Convert_FromSeresSchema_ShouldConvert(string xsdSchemaPath, string expectedMetamodelPath)
        {
            Given.That.XsdSchemaLoaded(xsdSchemaPath)
                .When.LoadedXsdSchemaConvertedToJsonSchema()
                .And.ConvertedJsonSchemaConvertedToModelMetadata()
                .And.ExpectedMetamodelLoaded(expectedMetamodelPath)
                .Then.MetamodelShouldBeEquivalentToExpected()
                .And.When.ModelMetadataConvertedToCsharpClass()
                .And.CSharpClassesCompiledToAssembly();

            Assert.NotNull(CompiledAssembly);
        }

        // Helper methods
        private JsonSchemaToMetamodelConverterTests ExpectedMetamodelLoaded(string expectedMetamodelPath)
        {
            string expectedMetamodelJson = SharedResourcesHelper.LoadTestDataAsString(expectedMetamodelPath);
            ExpectedModelMetadata = JsonSerializer.Deserialize<ModelMetadata>(expectedMetamodelJson, new JsonSerializerOptions() { PropertyNameCaseInsensitive = true, Converters = { new JsonStringEnumConverter() } });
            return this;
        }

        // Assertion methods
        private JsonSchemaToMetamodelConverterTests MetamodelShouldBeEquivalentToExpected()
        {
            MetadataAssertions.IsEquivalentTo(ExpectedModelMetadata, ModelMetadata);
            return this;
        }

        private JsonSchemaToMetamodelConverterTests MetamodelShouldHaveOneRootElement()
        {
            Assert.Single(ModelMetadata.Elements.Values.Where(e => e.ParentElement == null).ToList());
            return this;
        }
    }
}
