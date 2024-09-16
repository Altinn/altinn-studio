using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.DataModeling.Json.Keywords;
using FluentAssertions;
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

            validXml.Should().BeTrue();
        }

        [Fact]
        public void XmlModel_SeresBasic_ShouldDeserializeAndValidate()
        {
            _TestData.Model.CSharp.Melding melding = DeserializeFromXmlResource(SERESBASIC_XML_RESOURCE);

            melding.E1.Should().Be("Yo");
        }

        [Fact]
        public void CSharpModel_SeresBasic_ShouldSerializeToValidXml()
        {
            var melding = new _TestData.Model.CSharp.Melding() { E1 = "Yo" };

            var xml = SerializeToXml(melding);

            bool validXml = ValidateXml(xml);

            validXml.Should().BeTrue();
        }

        [Fact]
        public Task JsonModel_SeresBasic_ShouldValidate()
        {
            var json = SharedResourcesHelper.LoadTestDataAsString(SERESBASIC_JSON_RESOURCE);
            var jsonSchema = SharedResourcesHelper.LoadJsonSchemaTestData(SERESBASIC_JSON_SCHEMA_RESOURCE);
            var jsonDocument = JsonDocument.Parse(json);

            var validationResults = jsonSchema.Evaluate(jsonDocument.RootElement, new EvaluationOptions() { OutputFormat = OutputFormat.Hierarchical });

            validationResults.IsValid.Should().BeTrue();
            return Task.CompletedTask;
        }

        [Fact]
        public void JsonModel_SeresBasic_ShouldDeserializeAndValidate()
        {
            var json = SharedResourcesHelper.LoadTestDataAsString(SERESBASIC_JSON_RESOURCE);
            _TestData.Model.CSharp.Melding melding = JsonSerializer.Deserialize<_TestData.Model.CSharp.Melding>(json);

            melding.E1.Should().Be("Yo");
        }

        [Fact]
        public void CSharpModel_SeresBasic_ShouldSerializeToValidJson()
        {
            JsonSchemaKeywords.RegisterXsdKeywords();
            var melding = new _TestData.Model.CSharp.Melding() { E1 = "Yo" };

            var json = JsonSerializer.Serialize(melding);
            var jsonSchema = SharedResourcesHelper.LoadJsonSchemaTestData(SERESBASIC_JSON_SCHEMA_RESOURCE);
            var jsonDocument = JsonDocument.Parse(json);

            var validationResults = jsonSchema.Evaluate(jsonDocument.RootElement, new EvaluationOptions() { OutputFormat = OutputFormat.Hierarchical });

            validationResults.IsValid.Should().BeTrue();
        }

        private static _TestData.Model.CSharp.Melding DeserializeFromXmlResource(string xmlResource)
        {
            var xmlStream = SharedResourcesHelper.LoadTestData(xmlResource);

            return (_TestData.Model.CSharp.Melding)new System.Xml.Serialization.XmlSerializer(typeof(_TestData.Model.CSharp.Melding)).Deserialize(xmlStream);
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

        private static string SerializeToXml(_TestData.Model.CSharp.Melding melding)
        {
            var xmlSerializer = new System.Xml.Serialization.XmlSerializer(typeof(_TestData.Model.CSharp.Melding));
            var xmlWriter = new Utf8StringWriter();
            xmlSerializer.Serialize(xmlWriter, melding);

            return xmlWriter.ToString();
        }
    }
}
