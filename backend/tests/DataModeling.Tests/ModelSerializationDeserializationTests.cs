using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.DataModeling.Json.Keywords;
using Json.Schema;
using SharedResources.Tests;
using Xunit;
using Xunit.Abstractions;

namespace DataModeling.Tests
{
    public class ModelSerializationDeserializationTests
    {
        private readonly ITestOutputHelper _testOutputHelper;

        private const string SERESBASIC_XML_RESOURCE = "Model.Xml.Seres.SeresBasic.xml";
        private const string SERESBASIC_XSD_RESOURCE = "Model.XmlSchema.Seres.SeresBasicSchema.xsd";
        private const string SERESBASIC_JSON_RESOURCE = "Model.Json.Seres.SeresBasic.json";
        private const string SERESBASIC_JSON_SCHEMA_RESOURCE = "Model.JsonSchema.Seres.SeresBasicSchema.json";

        public ModelSerializationDeserializationTests(ITestOutputHelper testOutputHelper)
        {
            _testOutputHelper = testOutputHelper;
        }

        [Fact]
        public void XmlModel_SeresBasic_ShouldValidate()
        {
            var xml = SharedResourcesHelper.LoadTestDataAsString(SERESBASIC_XML_RESOURCE);

            var validXml = ValidateXml(xml);

            Assert.True(validXml);
        }

        [Fact]
        public void XmlModel_SeresBasic_ShouldDeserializeAndValidate()
        {
            _TestData.Model.CSharp.melding melding = DeserializeFromXmlResource(SERESBASIC_XML_RESOURCE);

            Assert.Equal("Yo", melding.E1);
        }

        [Fact]
        public void CSharpModel_SeresBasic_ShouldSerializeToValidXml()
        {
            var melding = new _TestData.Model.CSharp.melding() { E1 = "Yo" };

            var xml = SerializeToXml(melding);

            bool validXml = ValidateXml(xml);

            Assert.True(validXml);
        }

        [Fact]
        public Task JsonModel_SeresBasic_ShouldValidate()
        {
            var json = SharedResourcesHelper.LoadTestDataAsString(SERESBASIC_JSON_RESOURCE);
            var jsonSchema = SharedResourcesHelper.LoadJsonSchemaTestData(SERESBASIC_JSON_SCHEMA_RESOURCE);
            var jsonDocument = JsonDocument.Parse(json);

            var validationResults = jsonSchema.Evaluate(jsonDocument.RootElement, new EvaluationOptions() { OutputFormat = OutputFormat.Hierarchical });

            Assert.True(validationResults.IsValid);
            return Task.CompletedTask;
        }

        [Fact]
        public void JsonModel_SeresBasic_ShouldDeserializeAndValidate()
        {
            var json = SharedResourcesHelper.LoadTestDataAsString(SERESBASIC_JSON_RESOURCE);
            _TestData.Model.CSharp.melding melding = JsonSerializer.Deserialize<_TestData.Model.CSharp.melding>(json);

            Assert.Equal("Yo", melding.E1);
        }

        [Fact]
        public void CSharpModel_SeresBasic_ShouldSerializeToValidJson()
        {
            JsonSchemaKeywords.RegisterXsdKeywords();
            var melding = new _TestData.Model.CSharp.melding() { E1 = "Yo" };

            var json = JsonSerializer.Serialize(melding);
            var jsonSchema = SharedResourcesHelper.LoadJsonSchemaTestData(SERESBASIC_JSON_SCHEMA_RESOURCE);
            var jsonDocument = JsonDocument.Parse(json);

            var validationResults = jsonSchema.Evaluate(jsonDocument.RootElement, new EvaluationOptions() { OutputFormat = OutputFormat.Hierarchical });

            Assert.True(validationResults.IsValid);
        }

        private static _TestData.Model.CSharp.melding DeserializeFromXmlResource(string xmlResource)
        {
            var xmlStream = SharedResourcesHelper.LoadTestData(xmlResource);

            return (_TestData.Model.CSharp.melding)new System.Xml.Serialization.XmlSerializer(typeof(_TestData.Model.CSharp.melding)).Deserialize(xmlStream);
        }

        private bool ValidateXml(string xml)
        {
            var xmlSchemaStream = SharedResourcesHelper.LoadTestData(SERESBASIC_XSD_RESOURCE);
            var xmlSchemaValidator = new XmlSchemaValidator(xmlSchemaStream);

            var validXml = xmlSchemaValidator.Validate(xml);
            if (!validXml)
            {
                xmlSchemaValidator.ValidationErrors.ForEach(e => _testOutputHelper.WriteLine(e.Message));
            }

            return validXml;
        }

        private static string SerializeToXml(_TestData.Model.CSharp.melding melding)
        {
            var xmlSerializer = new System.Xml.Serialization.XmlSerializer(typeof(_TestData.Model.CSharp.melding));
            var xmlWriter = new Utf8StringWriter();
            xmlSerializer.Serialize(xmlWriter, melding);

            return xmlWriter.ToString();
        }
    }
}
