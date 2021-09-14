using System.IO;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Unicode;
using System.Threading.Tasks;
using System.Xml;
using System.Xml.Schema;
using Altinn.Studio.DataModeling.Converter.Json;
using Altinn.Studio.DataModeling.Converter.Xml;
using Altinn.Studio.DataModeling.Json;
using Altinn.Studio.DataModeling.Json.Keywords;
using DataModeling.Tests.Assertions;
using Json.Schema;
using Xunit;
using Xunit.Abstractions;

namespace DataModeling.Tests
{
    public class Seres2JsonSchema2SeresTests
    {
        private readonly ITestOutputHelper _testOutputHelper;

        public Seres2JsonSchema2SeresTests(ITestOutputHelper testOutputHelper)
        {
            _testOutputHelper = testOutputHelper;
        }

        [Theory]
        [InlineData("Seres/HvemErHvem.xsd", "Seres/HvemErHvem.xml")]
        [InlineData("Seres/schema_3473_201512_forms_3123_37927.xsd", "")]
        [InlineData("Seres/schema_4008_180226_forms_4186_37199.xsd", "", Skip = "Missing array support.")]
        [InlineData("Seres/schema_3919_2_forms_4623_39043.xsd", "")]
        [InlineData("Seres/schema_4741_4280_forms_5273_41269.xsd", "", Skip = "Missing array support.")]
        [InlineData("Seres/schema_4830_4000_forms_5524_41951.xsd", "", Skip = "Missing array support.")]
        [InlineData("Seres/schema_5222_2_forms_5909_43507.xsd", "")]
        [InlineData("Model/XmlSchema/SeresNillable.xsd", "")]
        public async Task ConvertSeresXsd_SeresGeneratedXsd_ShouldConvertToJsonSchemaAndBackToXsd(string xsdSchemaPath, string xmlPath)
        {
            JsonSchemaKeywords.RegisterXsdKeywords();

            XmlSchema originalXsd = ResourceHelpers.LoadXmlSchemaTestData(xsdSchemaPath);

            // Convert the XSD to JSON Schema
            var xsdToJsonConverter = new XmlSchemaToJsonSchemaConverter();
            JsonSchema convertedJsonSchema = xsdToJsonConverter.Convert(originalXsd);
            var convertedJsonSchemaString = JsonSerializer.Serialize(convertedJsonSchema, new JsonSerializerOptions() { Encoder = JavaScriptEncoder.Create(UnicodeRanges.BasicLatin, UnicodeRanges.Latin1Supplement) });

            // Convert the converted JSON Schema back to XSD
            var jsonToXsdConverter = new JsonSchemaToXmlSchemaConverter(new JsonSchemaNormalizer());
            var convertedXsd = jsonToXsdConverter.Convert(convertedJsonSchema);

            var convertedXsdString = await Serialize(convertedXsd);
            var originalXsdString = await Serialize(originalXsd);

            // The two XSD's should be structural equal, but there might be minor differences if you compare the text
            XmlSchemaAssertions.IsEquivalentTo(originalXsd, convertedXsd);

            if (!string.IsNullOrEmpty(xmlPath))
            {
                // The XML should validate against both XSD's
                var xml = ResourceHelpers.LoadTestDataAsString(xmlPath);
                Assert.True(ValidateXml(originalXsd, xml));
                Assert.True(ValidateXml(convertedXsd, xml));
            }
        }

        private bool ValidateXml(XmlSchema xmlSchema, string xml)
        {
            var xmlSchemaValidator = new TestHelpers.XmlSchemaValidator(xmlSchema);

            var validXml = xmlSchemaValidator.Validate(xml);
            if (!validXml)
            {
                xmlSchemaValidator.ValidationErrors.ForEach(e => _testOutputHelper.WriteLine(e.Message));
            }

            return validXml;
        }

        private static async Task<string> Serialize(XmlSchema xmlSchema)
        {
            string actualXml;
            await using (var sw = new Utf8StringWriter())
            await using (var xw = XmlWriter.Create(sw, new XmlWriterSettings { Indent = true, Async = true }))
            {
                xmlSchema.Write(xw);
                actualXml = sw.ToString();
            }

            return actualXml;
        }

        internal class Utf8StringWriter : StringWriter
        {
            public override Encoding Encoding => Encoding.UTF8;
        }
    }
}
