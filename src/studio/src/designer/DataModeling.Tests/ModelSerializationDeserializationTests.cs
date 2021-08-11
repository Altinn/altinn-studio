using System.IO;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using DataModeling.Tests.TestHelpers;
using FluentAssertions;
using Json.Schema;
using Xunit;
using Xunit.Abstractions;

namespace DataModeling.Tests
{
    public class ModelSerializationDeserializationTests
    {
        private readonly ITestOutputHelper _testOutputHelper;

        private const string SERESBASIC_XML_RESOURCE = "DataModeling.Tests._TestData.Model.Xml.SeresBasic.xml";
        private const string SERESBASIC_XSD_RESOURCE = "DataModeling.Tests._TestData.Model.XmlSchema.SeresBasicSchema.xsd";
        private const string SERESBASIC_JSON_RESOURCE = "DataModeling.Tests._TestData.Model.Json.SeresBasic.json";
        private const string SERESBASIC_JSON_SCHEMA_RESOURCE = "DataModeling.Tests._TestData.Model.JsonSchema.SeresBasicSchema.json";

        public ModelSerializationDeserializationTests(ITestOutputHelper testOutputHelper)
        {
            _testOutputHelper = testOutputHelper;
        }

        [Fact]
        public void XmlModel_SeresBasic_ShouldValidate()
        {
            var xml = EmbeddedResource.LoadDataFromEmbeddedResourceAsString(SERESBASIC_XML_RESOURCE);

            var validXml = ValidateXml(xml);

            validXml.Should().BeTrue();
        }

        [Fact]
        public void XmlModel_SeresBasic_ShouldDeserializeAndValidate()
        {
            _TestData.Model.CSharp.melding melding = DeserializeFromXmlResource(SERESBASIC_XML_RESOURCE);

            melding.e1.Should().Be("Yo");
        }

        [Fact]
        public void CSharpModel_SeresBasic_ShouldSerializeToValidXml()
        {
            var melding = new _TestData.Model.CSharp.melding() { e1 = "Yo" };

            var xml = SerializeToXml(melding);

            bool validXml = ValidateXml(xml);

            validXml.Should().BeTrue();
        }

        [Fact]
        public async Task JsonModel_SeresBasic_ShouldValidate()
        {
            var json = EmbeddedResource.LoadDataFromEmbeddedResourceAsString(SERESBASIC_JSON_RESOURCE);
            var jsonSchema = await EmbeddedResource.LoadDataFromEmbeddedResourceAsJsonSchema(SERESBASIC_JSON_SCHEMA_RESOURCE);
            var jsonDocument = JsonDocument.Parse(json);

            var validationResults = jsonSchema.Validate(jsonDocument.RootElement, new ValidationOptions() { });

            validationResults.IsValid.Should().BeTrue();
        }

        [Fact]
        public void JsonModel_SeresBasic_ShouldDeserializeAndValidate()
        {
            var json = EmbeddedResource.LoadDataFromEmbeddedResourceAsString(SERESBASIC_JSON_RESOURCE);
            _TestData.Model.CSharp.melding melding = JsonSerializer.Deserialize<_TestData.Model.CSharp.melding>(json);

            melding.e1.Should().Be("Yo");
        }

        [Fact]
        public async Task CSharpModel_SeresBasic_ShouldSerializeToValidJson()
        {
            var melding = new _TestData.Model.CSharp.melding() { e1 = "Yo" };

            var json = JsonSerializer.Serialize(melding);
            var jsonSchema = await EmbeddedResource.LoadDataFromEmbeddedResourceAsJsonSchema(SERESBASIC_JSON_SCHEMA_RESOURCE);
            var jsonDocument = JsonDocument.Parse(json);

            var validationResults = jsonSchema.Validate(jsonDocument.RootElement, new ValidationOptions() { });

            validationResults.IsValid.Should().BeTrue();
        }

        private static _TestData.Model.CSharp.melding DeserializeFromXmlResource(string xmlResource)
        {
            var xmlStream = EmbeddedResource.LoadDataFromEmbeddedResource(xmlResource);

            return (_TestData.Model.CSharp.melding)new System.Xml.Serialization.XmlSerializer(typeof(_TestData.Model.CSharp.melding)).Deserialize(xmlStream);
        }

        private bool ValidateXml(string xml)
        {
            var xmlSchemaStream = EmbeddedResource.LoadDataFromEmbeddedResource(SERESBASIC_XSD_RESOURCE);
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

        internal class Utf8StringWriter : StringWriter
        {
            public override Encoding Encoding => Encoding.UTF8;
        }
    }   
}
