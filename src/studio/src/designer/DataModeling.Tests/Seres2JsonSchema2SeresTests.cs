using System.IO;
using System.Text;
using System.Threading.Tasks;
using System.Xml;
using System.Xml.Schema;
using Altinn.Studio.DataModeling.Converter.Json;
using Altinn.Studio.DataModeling.Converter.Xml;
using Altinn.Studio.DataModeling.Json;
using Altinn.Studio.DataModeling.Json.Keywords;
using DataModeling.Tests.Assertions;
using DataModeling.Tests.TestDataClasses;
using Json.Schema;
using Xunit;
using Xunit.Abstractions;
using XmlSchemaValidator = DataModeling.Tests.TestHelpers.XmlSchemaValidator;

namespace DataModeling.Tests
{
    public class Seres2JsonSchema2SeresTests: FluentTestsBase<Seres2JsonSchema2SeresTests>
    {
        private readonly ITestOutputHelper _testOutputHelper;

        private XmlSchema OriginalXsdSchema { get; set; }

        private JsonSchema ConvertedJsonSchema { get; set; }

        private XmlSchema ConvertedXsdSchema { get; set; }

        public Seres2JsonSchema2SeresTests(ITestOutputHelper testOutputHelper)
        {
            _testOutputHelper = testOutputHelper;
        }

        [Theory]
        [ClassData(typeof(RoundTripConversionTestData))]
        public void ConvertSeresXsd_SeresGeneratedXsd_ShouldConvertToJsonSchemaAndBackToXsd(string xsdSchemaPath, string xmlPath)
        {
            Given.That.XsdSchemaLoaded(xsdSchemaPath)
                .And.JsonSchemaKeywordsRegistered()
                .When.LoadedXsdSchemaConvertedToJsonSchema()
                .And.When.ConvertedJsonSchemaConvertedToXsdSchema()
                .Then.OriginalAndConvertedXsdSchemasShouldBeEquivalent()
                .And.XmlShouldBeValidAgainstOriginalSchema(xmlPath)
                .And.XmlShouldBeValidAgainstConvertedSchema(xmlPath);
        }

        private bool ValidateXml(XmlSchema xmlSchema, string xml)
        {
            var xmlSchemaValidator = new XmlSchemaValidator(xmlSchema);

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

        // Fluent methods for test
        private Seres2JsonSchema2SeresTests JsonSchemaKeywordsRegistered()
        {
            JsonSchemaKeywords.RegisterXsdKeywords();
            return this;
        }

        private Seres2JsonSchema2SeresTests XsdSchemaLoaded(string xsdSchemaPath)
        {
            OriginalXsdSchema = ResourceHelpers.LoadXmlSchemaTestData(xsdSchemaPath);
            return this;
        }

        private Seres2JsonSchema2SeresTests LoadedXsdSchemaConvertedToJsonSchema()
        {
            var xsdToJsonConverter = new XmlSchemaToJsonSchemaConverter();
            ConvertedJsonSchema = xsdToJsonConverter.Convert(OriginalXsdSchema);
            return this;
        }

        private Seres2JsonSchema2SeresTests ConvertedJsonSchemaConvertedToXsdSchema()
        {
            var jsonToXsdConverter = new JsonSchemaToXmlSchemaConverter(new JsonSchemaNormalizer());
            ConvertedXsdSchema = jsonToXsdConverter.Convert(ConvertedJsonSchema);
            return this;
        }

       // Assertion methods
        private Seres2JsonSchema2SeresTests OriginalAndConvertedXsdSchemasShouldBeEquivalent()
        {
            XmlSchemaAssertions.IsEquivalentTo(OriginalXsdSchema, ConvertedXsdSchema);
            return this;
        }

        private Seres2JsonSchema2SeresTests XmlShouldBeValidAgainstOriginalSchema(string xmlPath)
        {
            if (!string.IsNullOrEmpty(xmlPath))
            {
                var xml = ResourceHelpers.LoadTestDataAsString(xmlPath);
                Assert.True(ValidateXml(OriginalXsdSchema, xml));
            }

            return this;
        }

        private Seres2JsonSchema2SeresTests XmlShouldBeValidAgainstConvertedSchema(string xmlPath)
        {
            if (!string.IsNullOrEmpty(xmlPath))
            {
                var xml = ResourceHelpers.LoadTestDataAsString(xmlPath);
                Assert.True(ValidateXml(ConvertedXsdSchema, xml));
            }

            return this;
        }
    }
}
