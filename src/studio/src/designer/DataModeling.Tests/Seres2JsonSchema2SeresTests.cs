using System.IO;
using System.Threading.Tasks;
using System.Xml;
using System.Xml.Schema;
using Altinn.Studio.DataModeling.Converter.Json;
using Altinn.Studio.DataModeling.Converter.Xml;
using Altinn.Studio.DataModeling.Json;
using Altinn.Studio.DataModeling.Json.Keywords;
using DataModeling.Tests.Assertions;
using DataModeling.Tests.TestHelpers;
using Json.Schema;
using Xunit;
using Xunit.Abstractions;

namespace DataModeling.Tests
{
    public class Seres2JsonSchema2SeresTests
    {
        ITestOutputHelper _testOutputHelper;

        public Seres2JsonSchema2SeresTests(ITestOutputHelper testOutputHelper)
        {
            _testOutputHelper = testOutputHelper;
        }

        [Theory]
        [InlineData("Seres/HvemErHvem_Simple.xsd", "Seres/HvemErHvem_Simple.xml", Skip = "Not feature complete to support this yet.")]
        public async Task ConvertSeresXsd_SeresGeneratedXsd_ShouldConvertToJsonSchemaAndBackToXsd(string xsdSchemaPath, string xmlPath)
        {
            JsonSchemaKeywords.RegisterXsdKeywords();

            XmlSchema originalXsd = ResourceHelpers.LoadXmlSchemaTestData(xsdSchemaPath);

            // Convert the XSD to JSON Schema
            var xsdToJsonConverter = new XmlSchemaToJsonSchemaConverter();
            JsonSchema convertedJsonSchema = xsdToJsonConverter.Convert(originalXsd);

            // Convert the converted JSON Schema back to XSD
            var jsonToXsdConverter = new JsonSchemaToXmlSchemaConverter(new JsonSchemaNormalizer());
            var convertedXsd = jsonToXsdConverter.Convert(convertedJsonSchema);

            // The two XSD's should be structural equal, but there might be minor differences if you compare the text
            XmlSchemaAssertions.IsEquivalentTo(originalXsd, convertedXsd);

            // The XML should validate against both XSD's
            var xml = ResourceHelpers.LoadTestDataAsString(xmlPath);
            Assert.True(ValidateXml(originalXsd, xml));
            Assert.True(ValidateXml(convertedXsd, xml));
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

        private async Task<string> SerializeXsdAsync(XmlSchema xmlSchema)
        {
            await using (var sw = new StringWriter())
            await using (var xw = XmlWriter.Create(sw, new XmlWriterSettings { Indent = true, Async = true }))
            {
                xmlSchema.Write(xw);
                return sw.ToString();
            }
        }
    }
}
