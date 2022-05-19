using System.Linq;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.Unicode;
using System.Xml.Schema;
using Altinn.Studio.DataModeling.Converter.Json.Strategy;
using Altinn.Studio.DataModeling.Converter.Xml;
using Altinn.Studio.DataModeling.Json.Formats;
using Altinn.Studio.DataModeling.Json.Keywords;
using Altinn.Studio.Designer.Factories.ModelFactory;
using Altinn.Studio.Designer.ModelMetadatalModels;
using Designer.Tests.Assertions;
using Designer.Tests.Utils;
using FluentAssertions;
using Json.Schema;
using Xunit;
using Xunit.Abstractions;

namespace Designer.Tests.Factories.ModelFactory
{
    public class JsonSchemaToMetamodelConverterTests
    {
        private readonly ITestOutputHelper _outputHelper;

        public JsonSchemaToMetamodelConverterTests(ITestOutputHelper outputHelper)
        {
            _outputHelper = outputHelper;

            JsonSchemaKeywords.RegisterXsdKeywords();
            JsonSchemaFormats.RegisterFormats();
        }

        [Theory]
        [InlineData("Model/Xsd/HvemErHvem.xsd", "Model/Metadata/HvemErHvem.metadata.json")]
        [InlineData("Model/Xsd/SeresBasicSchema.xsd", "Model/Metadata/SeresBasicSchema.metadata.json")]
        [InlineData("Model/Xsd/schema_5259_1_forms_9999_50000.xsd", "Model/Metadata/schema_5259_1_forms_9999_50000.metadata.json")]
        [InlineData("Model/Xsd/schema_5064_1_forms_5793_42882.xsd", "Model/Metadata/schema_5064_1_forms_5793_42882.metadata.json")]
        [InlineData("Model/Xsd/schema_5222_2_forms_5909_43507.xsd", "Model/Metadata/schema_5222_2_forms_5909_43507.metadata.json")]
        [InlineData("Model/Xsd/schema_4830_4000_forms_5524_41951.xsd", "Model/Metadata/schema_4830_4000_forms_5524_41951.metadata.json")]
        [InlineData("Model/Xsd/schema_4582_2000_forms_5244_42360.xsd", "Model/Metadata/schema_4582_2000_forms_5244_42360.metadata.json")]
        [InlineData("Model/Xsd/schema_4741_4280_forms_5273_41269.xsd", "Model/Metadata/schema_4741_4280_forms_5273_41269.metadata.json")]
        public void Convert_FromSeresSchema_ShouldConvert(string xsdSchemaPath, string expectedMetamodelPath)
        {
            // Arrange
            // Convert the Seres XSD to JSON Schema
            XmlSchema originalXsd = TestDataHelper.LoadXmlSchemaTestData(xsdSchemaPath);
            var xsdToJsonConverter = new XmlSchemaToJsonSchemaConverter();
            JsonSchema convertedJsonSchema = xsdToJsonConverter.Convert(originalXsd);
            var convertedJsonSchemaString = JsonSerializer.Serialize(convertedJsonSchema, new JsonSerializerOptions() { Encoder = JavaScriptEncoder.Create(UnicodeRanges.BasicLatin, UnicodeRanges.Latin1Supplement), WriteIndented = true });

            // Convert to Metadata model
            var metamodelConverter = new JsonSchemaToMetamodelConverter(new SeresJsonSchemaAnalyzer());
            metamodelConverter.KeywordProcessed += KeywordProcessedHandler;
            metamodelConverter.SubSchemaProcessed += SubSchemaProcessedHandler;

            // Act
            var actualMetamodel = metamodelConverter.Convert("melding", convertedJsonSchemaString);

            // Leaving this for easy access/manual verification
            var actualMetamodelJson = JsonSerializer.Serialize(actualMetamodel, new JsonSerializerOptions() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase, WriteIndented = true, Converters = { new JsonStringEnumConverter() } });

            // Assert
            var expectedMetamodelJson = TestDataHelper.LoadTestDataFromFileAsString(expectedMetamodelPath);
            var expectedMetamodel = JsonSerializer.Deserialize<ModelMetadata>(expectedMetamodelJson, new JsonSerializerOptions() { PropertyNameCaseInsensitive = true, Converters = { new JsonStringEnumConverter() } });
            MetadataAssertions.IsEquivalentTo(expectedMetamodel, actualMetamodel);

            actualMetamodel.Elements.Values.Where(e => e.ParentElement == null).ToList().Count.Should().Be(1);

            // Compile the generated class to verify it compiles without errors
            var classes = new JsonMetadataParser().CreateModelFromMetadata(actualMetamodel);
            var compiledAssembly = Compiler.CompileToAssembly(classes);
            compiledAssembly.Should().NotBeNull();
        }

        private void KeywordProcessedHandler(object sender, KeywordProcessedEventArgs e)
        {
            _outputHelper.WriteLine($"Processed keyword {e.Keyword.Keyword()} at {e.Path.Source}");
        }

        private void SubSchemaProcessedHandler(object sender, SubSchemaProcessedEventArgs e)
        {
            _outputHelper.WriteLine($"Processed sub-schema at {e.Path.Source}");
        }
    }
}
