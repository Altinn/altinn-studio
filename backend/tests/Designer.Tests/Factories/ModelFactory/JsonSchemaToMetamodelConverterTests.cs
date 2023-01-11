using System.Linq;
using System.Reflection;
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
using SharedResources.Tests;
using Xunit;
using Xunit.Abstractions;

namespace Designer.Tests.Factories.ModelFactory
{
    public class JsonSchemaToMetamodelConverterTests : FluentTestsBase<JsonSchemaToMetamodelConverterTests>
    {
        private readonly ITestOutputHelper _outputHelper;

        private XmlSchema _xsdSchema;
        private JsonSchema _convertedJsonSchema;
        private ModelMetadata _modelMetadata;
        private string _cSharpClasses;
        private Assembly _compiledAssembly;

        private ModelMetadata _expectedModelMetadata;

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
        [InlineData("Model/Xsd/SchemaWithTargetNamespace.xsd", "Model/Metadata/SchemaWithTargetNamespace.metadata.json")]
        public void Convert_FromSeresSchema_ShouldConvert(string xsdSchemaPath, string expectedMetamodelPath)
        {
            Given.That.XsdSchemaLoaded(xsdSchemaPath)
                .When.XsdSchemaConverted2JsonSchema()
                .And.JsonSchemaConverted2Metamodel()
                .And.ExpectedMetamodelLoaded(expectedMetamodelPath)
                .Then.MetamodelShouldBeEquivalentToExpected()
                .And.When.CSharpClassesCreatedFromMetamodel()
                .And.CSharpClassesCompiledToAssembly()
                .Then.CompiledAssemblyShouldNotBeNull();
        }

        private void KeywordProcessedHandler(object sender, KeywordProcessedEventArgs e)
        {
            _outputHelper.WriteLine($"Processed keyword {e.Keyword.Keyword()} at {e.Path.Source}");
        }

        private void SubSchemaProcessedHandler(object sender, SubSchemaProcessedEventArgs e)
        {
            _outputHelper.WriteLine($"Processed sub-schema at {e.Path.Source}");
        }

        // Fluent methods
        private JsonSchemaToMetamodelConverterTests XsdSchemaLoaded(string xsdSchemaPath)
        {
            _xsdSchema = TestDataHelper.LoadXmlSchemaTestData(xsdSchemaPath);
            return this;
        }

        private JsonSchemaToMetamodelConverterTests XsdSchemaConverted2JsonSchema()
        {
            var xsdToJsonConverter = new XmlSchemaToJsonSchemaConverter();
            _convertedJsonSchema = xsdToJsonConverter.Convert(_xsdSchema);
            return this;
        }

        private JsonSchemaToMetamodelConverterTests JsonSchemaConverted2Metamodel()
        {
            var metamodelConverter = new JsonSchemaToMetamodelConverter(new SeresJsonSchemaAnalyzer());
            metamodelConverter.KeywordProcessed += KeywordProcessedHandler;
            metamodelConverter.SubSchemaProcessed += SubSchemaProcessedHandler;

            var convertedJsonSchemaString = JsonSerializer.Serialize(_convertedJsonSchema, new JsonSerializerOptions() { Encoder = JavaScriptEncoder.Create(UnicodeRanges.BasicLatin, UnicodeRanges.Latin1Supplement), WriteIndented = true });

            _modelMetadata = metamodelConverter.Convert(convertedJsonSchemaString);
            return this;
        }

        private JsonSchemaToMetamodelConverterTests ExpectedMetamodelLoaded(string expectedMetamodelPath)
        {
            var expectedMetamodelJson = TestDataHelper.LoadTestDataFromFileAsString(expectedMetamodelPath);
            _expectedModelMetadata = JsonSerializer.Deserialize<ModelMetadata>(expectedMetamodelJson, new JsonSerializerOptions() { PropertyNameCaseInsensitive = true, Converters = { new JsonStringEnumConverter() } });
            return this;
        }

        private JsonSchemaToMetamodelConverterTests CSharpClassesCreatedFromMetamodel()
        {
            _cSharpClasses = new JsonMetadataParser().CreateModelFromMetadata(_modelMetadata);
            return this;
        }

        private JsonSchemaToMetamodelConverterTests CSharpClassesCompiledToAssembly()
        {
            _compiledAssembly = Compiler.CompileToAssembly(_cSharpClasses);
            return this;
        }

        // Assertion methods
        private JsonSchemaToMetamodelConverterTests MetamodelShouldBeEquivalentToExpected()
        {
            MetadataAssertions.IsEquivalentTo(_expectedModelMetadata, _modelMetadata);
            return this;
        }

        private JsonSchemaToMetamodelConverterTests MetamodelShouldHaveOneRootElement()
        {
            _modelMetadata.Elements.Values.Where(e => e.ParentElement == null).ToList().Count.Should().Be(1);
            return this;
        }

        private JsonSchemaToMetamodelConverterTests CompiledAssemblyShouldNotBeNull()
        {
            _compiledAssembly.Should().NotBeNull();
            return this;
        }
    }
}
