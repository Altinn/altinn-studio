using System.IO;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Threading.Tasks;
using System.Xml.Schema;
using Altinn.Studio.DataModeling.Converter.Xml;
using Altinn.Studio.DataModeling.Json.Keywords;
using DataModeling.Tests.Assertions;
using Json.More;
using Json.Schema;
using Xunit;
using Xunit.Abstractions;

namespace DataModeling.Tests
{
    public class XmlSchemaToJsonTests
    {
        private readonly ITestOutputHelper _testOutputHelper;

        public XmlSchemaToJsonTests(ITestOutputHelper testOutputHelper)
        {
            _testOutputHelper = testOutputHelper;
        }

        [Theory]
        [InlineData("Model/XmlSchema/SimpleAll.xsd", "Model/JsonSchema/SimpleAll.json", "Test to verify conversion from XSD to JSON Schema - feature: SimpleAll")]
        [InlineData("Model/XmlSchema/AltinnAnnotation.xsd", "Model/JsonSchema/AltinnAnnotation.json", "Test to verify conversion from XSD to JSON Schema - feature: AltinnAnnotation")]
        [InlineData("Model/XmlSchema/Any.xsd", "Model/JsonSchema/Any.json", "Test to verify conversion from XSD to JSON Schema - feature: Any")]
        [InlineData("Model/XmlSchema/Attributes.xsd", "Model/JsonSchema/Attributes.json", "Test to verify conversion from XSD to JSON Schema - feature: Attributes")]
        [InlineData("Model/XmlSchema/BuiltinTypes.xsd", "Model/JsonSchema/BuiltinTypes.json", "Test to verify conversion from XSD to JSON Schema - feature: BuiltinTypes")]
        [InlineData("Model/XmlSchema/SimpleChoice.xsd", "Model/JsonSchema/SimpleChoice.json", "Test to verify conversion from XSD to JSON Schema - feature: SimpleChoice")]
        [InlineData("Model/XmlSchema/NestedChoice.xsd", "Model/JsonSchema/NestedChoice.json", "Test to verify conversion from XSD to JSON Schema - feature: NestedChoice")]
        [InlineData("Model/XmlSchema/NestedWithOptionalChoice.xsd", "Model/JsonSchema/NestedWithOptionalChoice.json", "Test to verify conversion from XSD to JSON Schema - feature: NestedWithOptionalChoice")]
        [InlineData("Model/XmlSchema/NestedWithArrayChoice.xsd", "Model/JsonSchema/NestedWithArrayChoice.json", "Test to verify conversion from XSD to JSON Schema - feature: NestedWithArrayChoice")]
        [InlineData("Model/XmlSchema/ComplexContentExtension.xsd", "Model/JsonSchema/ComplexContentExtension.json", "Test to verify conversion from XSD to JSON Schema - feature: ComplexContentExtension")]
        [InlineData("Model/XmlSchema/ComplexContentRestriction.xsd", "Model/JsonSchema/ComplexContentRestriction.json", "Test to verify conversion from XSD to JSON Schema - feature: ComplexContentRestriction")]
        [InlineData("Model/XmlSchema/ComplexSchema.xsd", "Model/JsonSchema/ComplexSchema.json", "Test to verify conversion from XSD to JSON Schema - feature: ComplexSchema")]
        [InlineData("Model/XmlSchema/Definitions.xsd", "Model/JsonSchema/Definitions.json", "Test to verify conversion from XSD to JSON Schema - feature: Definitions")]
        [InlineData("Model/XmlSchema/ElementAnnotation.xsd", "Model/JsonSchema/ElementAnnotation.json", "Test to verify conversion from XSD to JSON Schema - feature: ElementAnnotation")]
        [InlineData("Model/XmlSchema/SimpleTypeRestrictions.xsd", "Model/JsonSchema/SimpleTypeRestrictions.json", "Test to verify conversion from XSD to JSON Schema - feature: SimpleTypeRestrictions")]
        [InlineData("Model/XmlSchema/SimpleSequence.xsd", "Model/JsonSchema/SimpleSequence.json", "Test to verify conversion from XSD to JSON Schema - feature: SimpleSequence")]
        [InlineData("Model/XmlSchema/NestedArrays.xsd", "Model/JsonSchema/NestedArrays.json", "Test to verify conversion from XSD to JSON Schema - feature: NestedArrays")]
        [InlineData("Model/XmlSchema/NestedSequence.xsd", "Model/JsonSchema/NestedSequence.json", "Test to verify conversion from XSD to JSON Schema - feature: NestedSequence")]
        [InlineData("Model/XmlSchema/NestedSequences.xsd", "Model/JsonSchema/NestedSequences.json", "Test to verify conversion from XSD to JSON Schema - feature: NestedSequences")]
        [InlineData("Model/XmlSchema/InterleavedNestedSequences.xsd", "Model/JsonSchema/InterleavedNestedSequences.json", "Test to verify conversion from XSD to JSON Schema - feature: InterleavedNestedSequences")]
        [InlineData("Model/XmlSchema/NestedWithOptionalSequence.xsd", "Model/JsonSchema/NestedWithOptionalSequence.json", "Test to verify conversion from XSD to JSON Schema - feature: NestedWithOptionalSequence")]
        [InlineData("Model/XmlSchema/NestedWithArraySequence.xsd", "Model/JsonSchema/NestedWithArraySequence.json", "Test to verify conversion from XSD to JSON Schema - feature: NestedWithArraySequence")]
        [InlineData("Model/XmlSchema/SimpleContentExtension.xsd", "Model/JsonSchema/SimpleContentExtension.json", "Test to verify conversion from XSD to JSON Schema - feature: SimpleContentExtension")]
        [InlineData("Model/XmlSchema/SimpleContentRestriction.xsd", "Model/JsonSchema/SimpleContentRestriction.json", "Test to verify conversion from XSD to JSON Schema - feature: SimpleContentRestriction")]
        [InlineData("Model/XmlSchema/SimpleTypeList.xsd", "Model/JsonSchema/SimpleTypeList.json", "Test to verify conversion from XSD to JSON Schema - feature: SimpleTypeList")]
        [InlineData("Model/XmlSchema/SeresWithAttributes.xsd", "Model/JsonSchema/SeresWithAttributes.json", "Test to verify conversion from XSD to JSON Schema - feature: SeresWithAttributes")]
        [InlineData("Model/XmlSchema/SeresWithAnyAttribute.xsd", "Model/JsonSchema/SeresWithAnyAttribute.json", "Test to verify conversion from XSD to JSON Schema - feature: SeresWithAnyAttribute")]
        [InlineData("Model/XmlSchema/NillableAttribute.xsd", "Model/JsonSchema/NillableAttribute.json", "Test to verify conversion from XSD to JSON Schema - feature: NillableAttribute")]
        [InlineData("Model/XmlSchema/SeresSimpleContentRestriction.xsd", "Model/JsonSchema/SeresSimpleContentRestriction.json", "Test to verify conversion from XSD to JSON Schema - feature: SeresSimpleContentRestriction")]
        [InlineData("Model/XmlSchema/SeresArray.xsd", "Model/JsonSchema/SeresArray.json", "Test to verify conversion from XSD to JSON Schema - feature: arrays")]
        [InlineData("Model/XmlSchema/SeresComplexType.xsd", "Model/JsonSchema/SeresComplexType.json", "Test to verify conversion from XSD to JSON Schema - feature: arrays")]
        [InlineData("Model/XmlSchema/SeresComplexContentExtension.xsd", "Model/JsonSchema/SeresComplexContentExtension.json", "Test to verify conversion from XSD to JSON Schema - feature: complex content extension")]
        public async Task XmlSchema_to_JsonSchema_Converter(string schemaPath, string expectedPath, string testCase)
        {
            _testOutputHelper.WriteLine(testCase);

            // Arrange
            JsonSchemaKeywords.RegisterXsdKeywords();
            var converter = new XmlSchemaToJsonSchemaConverter();

            var xsd = ResourceHelpers.LoadXmlSchemaTestData(schemaPath);
            var actual = converter.Convert(xsd);

            //await using var fs = new FileStream(Path.Join("C:\\Dev\\altinn-studio\\src\\studio\\src\\designer\\DataModeling.Tests\\_TestData\\Model\\JsonSchema\\", Path.GetFileName(expectedPath)), FileMode.Truncate, FileAccess.Write);

            //await using var ms = new MemoryStream();
            //await using var writer = new Utf8JsonWriter(ms, new JsonWriterOptions { Indented = true, Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping });
            //actual.ToJsonDocument().WriteTo(writer);
            //await writer.FlushAsync();
            //var actualJson = Encoding.UTF8.GetString(ms.GetBuffer(), 0, (int)ms.Length);
            // await SerializeJsonSchemaToFile(actual, expectedPath);
            var actualJson = await SerializeJsonSchemaToString(actual);

            // Assert
            var expected = await ResourceHelpers.LoadJsonSchemaTestData(expectedPath);
            JsonSchemaAssertions.IsEquivalentTo(expected, actual);
        }

        [Theory]
        [InlineData("Model/XmlSchema/SeresWithSpecifiedAndAnyAttributes.xsd", "Model/JsonSchema/SeresWithSpecifiedAndAnyAttributes.json", "Test to verify conversion from XSD to JSON Schema - feature: SeresWithSpecifiedAndAnyAttributes")]
        public async Task XmlSchema_to_JsonSchema_Converter_v2(string schemaPath, string expectedPath, string testCase)
        {
            _testOutputHelper.WriteLine(testCase);

            // Arrange
            JsonSchemaKeywords.RegisterXsdKeywords();
            var converter = new XmlSchemaToJsonSchemaConverter();

            var xsd = ResourceHelpers.LoadXmlSchemaTestData(schemaPath);
            var actual = converter.Convert(xsd);

            ////await using var fs = new FileStream(Path.Join(@"C:\Repos\altinn-studio\src\studio\src\designer\DataModeling.Tests\_TestData\Model\JsonSchema", Path.GetFileName(expectedPath)), FileMode.Truncate, FileAccess.Write);
            ////await using var ms = new MemoryStream();
            ////await using var writer = new Utf8JsonWriter(fs, new JsonWriterOptions { Indented = true, Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping });
            ////actual.ToJsonDocument().WriteTo(writer);
            ////await writer.FlushAsync();

            // var actualJson = Encoding.UTF8.GetString(ms.GetBuffer(), 0, (int) ms.Length);

            // Assert
            var expected = await ResourceHelpers.LoadJsonSchemaTestData(expectedPath);
            JsonSchemaAssertions.IsEquivalentTo(expected, actual);
        }

        private static async Task SerializeJsonSchemaToFile(JsonSchema schema, string filename)
        {
            await using var fs = new FileStream(Path.Join("C:\\Dev\\altinn-studio\\src\\studio\\src\\designer\\DataModeling.Tests\\_TestData\\Model\\JsonSchema\\", Path.GetFileName(filename)), FileMode.Truncate, FileAccess.Write);
            await using var writer = new Utf8JsonWriter(fs, new JsonWriterOptions { Indented = true, Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping });
            schema.ToJsonDocument().WriteTo(writer);
            await writer.FlushAsync();
        }

        private static async Task<string> SerializeJsonSchemaToString(JsonSchema schema)
        {
            await using var ms = new MemoryStream();
            await using var writer = new Utf8JsonWriter(ms, new JsonWriterOptions { Indented = true, Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping });
            schema.ToJsonDocument().WriteTo(writer);
            await writer.FlushAsync();
            return Encoding.UTF8.GetString(ms.GetBuffer(), 0, (int)ms.Length);
        }
    }
}
