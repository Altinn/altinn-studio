using System.IO;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Threading.Tasks;
using System.Xml.Schema;
using Altinn.Studio.DataModeling.Converter.Json;
using Altinn.Studio.DataModeling.Converter.Xml;
using Altinn.Studio.DataModeling.Json;
using Altinn.Studio.DataModeling.Json.Formats;
using Altinn.Studio.DataModeling.Json.Keywords;

using DataModeling.Tests.Assertions;

using Json.More;
using Json.Schema;

using Xunit;
using Xunit.Abstractions;

namespace DataModeling.Tests
{
    public class XmlSchemaToJsonTests: FluentTestsBase<XmlSchemaToJsonTests>
    {
        private readonly ITestOutputHelper _testOutputHelper;
        private XmlSchema _loadedXsdSchema;
        private JsonSchema _loadedJsonSchema;
        private JsonSchema _convertedJsonSchema;

        public XmlSchemaToJsonTests(ITestOutputHelper testOutputHelper)
        {
            _testOutputHelper = testOutputHelper;
        }

        [Theory]
        [InlineData("Model/XmlSchema/General/SimpleAll.xsd", "Model/JsonSchema/General/SimpleAll.json", "Test to verify conversion from XSD to JSON Schema - feature: SimpleAll")]
        [InlineData("Model/XmlSchema/AltinnAnnotation.xsd", "Model/JsonSchema/AltinnAnnotation.json", "Test to verify conversion from XSD to JSON Schema - feature: AltinnAnnotation")]
        [InlineData("Model/XmlSchema/General/Any.xsd", "Model/JsonSchema/General/Any.json", "Test to verify conversion from XSD to JSON Schema - feature: Any")]
        [InlineData("Model/XmlSchema/General/Attributes.xsd", "Model/JsonSchema/General/Attributes.json", "Test to verify conversion from XSD to JSON Schema - feature: Attributes")]
        [InlineData("Model/XmlSchema/General/BuiltinTypes.xsd", "Model/JsonSchema/General/BuiltinTypes.json", "Test to verify conversion from XSD to JSON Schema - feature: BuiltinTypes")]
        [InlineData("Model/XmlSchema/General/SimpleChoice.xsd", "Model/JsonSchema/General/SimpleChoice.json", "Test to verify conversion from XSD to JSON Schema - feature: SimpleChoice")]
        [InlineData("Model/XmlSchema/General/NestedChoice.xsd", "Model/JsonSchema/General/NestedChoice.json", "Test to verify conversion from XSD to JSON Schema - feature: NestedChoice")]
        [InlineData("Model/XmlSchema/General/NestedWithOptionalChoice.xsd", "Model/JsonSchema/General/NestedWithOptionalChoice.json", "Test to verify conversion from XSD to JSON Schema - feature: NestedWithOptionalChoice")]
        [InlineData("Model/XmlSchema/General/NestedWithArrayChoice.xsd", "Model/JsonSchema/General/NestedWithArrayChoice.json", "Test to verify conversion from XSD to JSON Schema - feature: NestedWithArrayChoice")]
        [InlineData("Model/XmlSchema/General/ComplexContentExtension.xsd", "Model/JsonSchema/General/ComplexContentExtension.json", "Test to verify conversion from XSD to JSON Schema - feature: ComplexContentExtension")]
        [InlineData("Model/XmlSchema/General/ComplexContentRestriction.xsd", "Model/JsonSchema/General/ComplexContentRestriction.json", "Test to verify conversion from XSD to JSON Schema - feature: ComplexContentRestriction")]
        [InlineData("Model/XmlSchema/General/ComplexSchema.xsd", "Model/JsonSchema/General/ComplexSchema.json", "Test to verify conversion from XSD to JSON Schema - feature: ComplexSchema")]
        [InlineData("Model/XmlSchema/General/Definitions.xsd", "Model/JsonSchema/General/Definitions.json", "Test to verify conversion from XSD to JSON Schema - feature: Definitions")]
        [InlineData("Model/XmlSchema/General/ElementAnnotation.xsd", "Model/JsonSchema/General/ElementAnnotation.json", "Test to verify conversion from XSD to JSON Schema - feature: ElementAnnotation")]
        [InlineData("Model/XmlSchema/General/SimpleTypeRestrictions.xsd", "Model/JsonSchema/General/SimpleTypeRestrictions.json", "Test to verify conversion from XSD to JSON Schema - feature: SimpleTypeRestrictions")]
        [InlineData("Model/XmlSchema/General/SimpleSequence.xsd", "Model/JsonSchema/General/SimpleSequence.json", "Test to verify conversion from XSD to JSON Schema - feature: SimpleSequence")]
        [InlineData("Model/XmlSchema/General/NestedArrays.xsd", "Model/JsonSchema/General/NestedArrays.json", "Test to verify conversion from XSD to JSON Schema - feature: NestedArrays")]
        [InlineData("Model/XmlSchema/General/NestedSequence.xsd", "Model/JsonSchema/General/NestedSequence.json", "Test to verify conversion from XSD to JSON Schema - feature: NestedSequence")]
        [InlineData("Model/XmlSchema/General/NestedSequences.xsd", "Model/JsonSchema/General/NestedSequences.json", "Test to verify conversion from XSD to JSON Schema - feature: NestedSequences")]
        [InlineData("Model/XmlSchema/General/InterleavedNestedSequences.xsd", "Model/JsonSchema/General/InterleavedNestedSequences.json", "Test to verify conversion from XSD to JSON Schema - feature: InterleavedNestedSequences")]
        [InlineData("Model/XmlSchema/General/NestedWithOptionalSequence.xsd", "Model/JsonSchema/General/NestedWithOptionalSequence.json", "Test to verify conversion from XSD to JSON Schema - feature: NestedWithOptionalSequence")]
        [InlineData("Model/XmlSchema/General/NestedWithArraySequence.xsd", "Model/JsonSchema/General/NestedWithArraySequence.json", "Test to verify conversion from XSD to JSON Schema - feature: NestedWithArraySequence")]
        [InlineData("Model/XmlSchema/General/SimpleContentExtension.xsd", "Model/JsonSchema/General/SimpleContentExtension.json", "Test to verify conversion from XSD to JSON Schema - feature: SimpleContentExtension")]
        [InlineData("Model/XmlSchema/General/SimpleContentRestriction.xsd", "Model/JsonSchema/General/SimpleContentRestriction.json", "Test to verify conversion from XSD to JSON Schema - feature: SimpleContentRestriction")]
        [InlineData("Model/XmlSchema/General/SimpleTypeList.xsd", "Model/JsonSchema/General/SimpleTypeList.json", "Test to verify conversion from XSD to JSON Schema - feature: SimpleTypeList")]
        [InlineData("Model/XmlSchema/Seres/SeresWithAttributes.xsd", "Model/JsonSchema/Seres/SeresWithAttributes.json", "Test to verify conversion from XSD to JSON Schema - feature: SeresWithAttributes")]
        [InlineData("Model/XmlSchema/Seres/SeresWithAnyAttribute.xsd", "Model/JsonSchema/Seres/SeresWithAnyAttribute.json", "Test to verify conversion from XSD to JSON Schema - feature: SeresWithAnyAttribute")]
        [InlineData("Model/XmlSchema/General/NillableAttribute.xsd", "Model/JsonSchema/General/NillableAttribute.json", "Test to verify conversion from XSD to JSON Schema - feature: NillableAttribute")]
        [InlineData("Model/XmlSchema/Seres/SeresSimpleContentRestriction.xsd", "Model/JsonSchema/Seres/SeresSimpleContentRestriction.json", "Test to verify conversion from XSD to JSON Schema - feature: SeresSimpleContentRestriction")]
        [InlineData("Model/XmlSchema/Seres/SeresArray.xsd", "Model/JsonSchema/Seres/SeresArray.json", "Test to verify conversion from XSD to JSON Schema - feature: arrays")]
        [InlineData("Model/XmlSchema/Seres/SeresComplexType.xsd", "Model/JsonSchema/Seres/SeresComplexType.json", "Test to verify conversion from XSD to JSON Schema - feature: arrays")]
        [InlineData("Model/XmlSchema/Seres/SeresComplexContentExtension.xsd", "Model/JsonSchema/Seres/SeresComplexContentExtension.json", "Test to verify conversion from XSD to JSON Schema - feature: complex content extension")]
        [InlineData("Model/XmlSchema/Seres/SeresWithSpecifiedAndAnyAttributes.xsd", "Model/JsonSchema/Seres/SeresWithSpecifiedAndAnyAttributes.json", "Test to verify conversion from XSD to JSON Schema - feature: SeresWithSpecifiedAndAnyAttributes")]
        [InlineData("Model/XmlSchema/Seres/SeresNillable.xsd", "Model/JsonSchema/Seres/SeresNillable.json", "Test to verify conversion from XSD to JSON Schema - feature: Nillable ellements")]
        [InlineData("Model/XmlSchema/Seres/SeresSimpleTypeRestrictions.xsd", "Model/JsonSchema/Seres/SeresSimpleTypeRestrictions.json", "Test to verify conversion from XSD to JSON Schema - feature: SeresSimpleTypeRestrictions")]
        public async Task XmlSchema_to_JsonSchema_Converter(string schemaPath, string expectedPath, string testCase)
        {
            _testOutputHelper.WriteLine(testCase);

            await Given.That.JsonSchemaKeywordsRegistered()
                .And.JsonFormatsRegistered()
                .And.XsdSchemaLoaded(schemaPath)
                .And.JsonSchemaLoaded(expectedPath);

            When.LoadedXsdSchemaConvertedToJsonSchema()
                .Then.LoadedAndConvertedJsonSchemasShouldBeEquivalent();
        }

        private static async Task<string> SerializeJsonSchemaToString(JsonSchema schema)
        {
            await using var ms = new MemoryStream();
            await using var writer = new Utf8JsonWriter(ms, new JsonWriterOptions { Indented = true, Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping });
            schema.ToJsonDocument().WriteTo(writer);
            await writer.FlushAsync();
            return Encoding.UTF8.GetString(ms.GetBuffer(), 0, (int)ms.Length);
        }

        // Fluent methods for test
        private XmlSchemaToJsonTests JsonSchemaKeywordsRegistered()
        {
            JsonSchemaKeywords.RegisterXsdKeywords();
            return this;
        }

        private XmlSchemaToJsonTests JsonFormatsRegistered()
        {
            JsonSchemaFormats.RegisterFormats();
            return this;
        }

        private XmlSchemaToJsonTests XsdSchemaLoaded(string xsdSchemaPath)
        {
            _loadedXsdSchema = ResourceHelpers.LoadXmlSchemaTestData(xsdSchemaPath);
            return this;
        }

        private async Task<XmlSchemaToJsonTests> JsonSchemaLoaded(string jsonSchemaPath)
        {
            _loadedJsonSchema = await ResourceHelpers.LoadJsonSchemaTestData(jsonSchemaPath);
            return this;
        }

        private XmlSchemaToJsonTests LoadedXsdSchemaConvertedToJsonSchema()
        {
            var xsdToJsonConverter = new XmlSchemaToJsonSchemaConverter();
            _convertedJsonSchema = xsdToJsonConverter.Convert(_loadedXsdSchema);
            return this;
        }

        // Assertion methods
        private XmlSchemaToJsonTests LoadedAndConvertedJsonSchemasShouldBeEquivalent()
        {
            JsonSchemaAssertions.IsEquivalentTo(_loadedJsonSchema, _convertedJsonSchema);
            return this;
        }
    }
}
