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
        [InlineData("Seres/HvemErHvem.xsd", "Seres/HvemErHvem.xml")]
        [InlineData("Model/XmlSchema/Seres/SeresNillable.xsd", "")]
        [InlineData("Seres/schema_3473_201512_forms_3123_37927.xsd", "")]
        [InlineData("Seres/schema_4008_180226_forms_4186_37199.xsd", "")]
        [InlineData("Seres/schema_3919_2_forms_4623_39043.xsd", "")]
        [InlineData("Seres/schema_4741_4280_forms_5273_41269.xsd", "")]
        [InlineData("Seres/schema_4830_4000_forms_5524_41951.xsd", "")]
        [InlineData("Seres/schema_5222_2_forms_5909_43507.xsd", "")]
        [InlineData("Seres/schema_4532_1_forms_5274_41065.xsd", "")]
        [InlineData("Seres/schema_4527_11500_forms_5273_41269.xsd", "")]
        [InlineData("Seres/schema_4582_2000_forms_5244_42360.xsd", "")]
        [InlineData("Seres/schema_5064_1_forms_5793_42882.xsd", "")]
        [InlineData("Seres/schema_5259_1_forms_9999_50000.xsd", "")]
        [InlineData("Seres/schema_4956_1_forms_5692_42617.xsd", "")]
        [InlineData("Seres/schema_4660_1_forms_2500_2500.xsd", "")]
        [InlineData("Seres/schema_4108-41505.xsd", "")]
        public void ConvertSeresXsd_SeresGeneratedXsd_ShouldConvertToJsonSchemaAndBackToXsd(string xsdSchemaPath, string xmlPath)
        {
            Given.That.XsdSchemaLoaded(xsdSchemaPath)
                .And.JsonSchemaKeywordsRegistered()
                .When.LoadedXsdSchemaConvertedToJsonSchema()
                .And.When.ConvertedJsonSchemaConvertedToXsdSchema()
                .Then.OriginalAndConvertedXsdSchemasShouldBeEquivalent()
                .And.XmlShouldBeValidWithOriginalAndConvertedSchema(xmlPath);
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

        private Seres2JsonSchema2SeresTests XmlShouldBeValidWithOriginalAndConvertedSchema(string xmlPath)
        {
            if (!string.IsNullOrEmpty(xmlPath))
            {
                // The XML should validate against both XSD's
                var xml = ResourceHelpers.LoadTestDataAsString(xmlPath);
                Assert.True(ValidateXml(OriginalXsdSchema, xml));
                Assert.True(ValidateXml(ConvertedXsdSchema, xml));
            }

            return this;
        }
    }
}
