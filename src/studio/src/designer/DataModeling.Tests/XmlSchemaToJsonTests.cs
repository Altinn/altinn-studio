using System.IO;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Threading.Tasks;
using System.Xml.Schema;
using Altinn.Studio.DataModeling.Converter.Xml;
using Altinn.Studio.DataModeling.Json.Formats;
using Altinn.Studio.DataModeling.Json.Keywords;
using DataModeling.Tests.Assertions;
using DataModeling.Tests.TestDataClasses;
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
        [ClassData(typeof(Xml2JsonTestData))]
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
