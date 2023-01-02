using System.Xml.Schema;
using DataModeling.Tests.Assertions;
using DataModeling.Tests.BaseClasses;
using DataModeling.Tests.TestDataClasses;
using Xunit;
using Xunit.Abstractions;
using XmlSchemaValidator = DataModeling.Tests.TestHelpers.XmlSchemaValidator;

namespace DataModeling.Tests
{
    public class Seres2JsonSchema2SeresTests: SchemaConversionTestsBase<Seres2JsonSchema2SeresTests>
    {
        private readonly ITestOutputHelper _testOutputHelper;

        public Seres2JsonSchema2SeresTests(ITestOutputHelper testOutputHelper)
        {
            _testOutputHelper = testOutputHelper;
        }

        [Theory]
        [ClassData(typeof(RoundTripConversionTestData))]
        public void ConvertSeresXsd_SeresGeneratedXsd_ShouldConvertToJsonSchemaAndBackToXsd(string xsdSchemaPath, string xmlPath)
        {
            Given.That.XsdSchemaLoaded(xsdSchemaPath)
                .When.LoadedXsdSchemaConvertedToJsonSchema()
                .And.When.ConvertedJsonSchemaConvertedToXsdSchema()
                .Then.OriginalAndConvertedXsdSchemasShouldBeEquivalent()
                .And.XmlShouldBeValidAgainstSchema(xmlPath, LoadedXsdSchema)
                .And.XmlShouldBeValidAgainstSchema(xmlPath, ConvertedXsdSchema);
        }

        // Assertion methods
        private Seres2JsonSchema2SeresTests OriginalAndConvertedXsdSchemasShouldBeEquivalent()
        {
            XmlSchemaAssertions.IsEquivalentTo(LoadedXsdSchema, ConvertedXsdSchema);
            return this;
        }

        private Seres2JsonSchema2SeresTests XmlShouldBeValidAgainstSchema(string xmlPath, XmlSchema schema)
        {
            if (!string.IsNullOrEmpty(xmlPath))
            {
                var xml = ResourceHelpers.LoadTestDataAsString(xmlPath);
                Assert.True(ValidateXml(schema, xml));
            }

            return this;
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
    }
}
