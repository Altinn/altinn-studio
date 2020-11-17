using System;
using System.IO;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;
using System.Xml;
using System.Xml.Schema;
using Altinn.Studio.Designer.Factories.ModelFactory;
using Altinn.Studio.Designer.Factories.ModelFactory.Manatee.Json;
using Manatee.Json;
using Manatee.Json.Schema;
using Manatee.Json.Serialization;
using Xunit;

namespace Designer.Tests.Factories.ModelFactory
{
    /// <summary>
    /// Represents a collection of tests of the <see cref="XsdToJsonSchema"/> class.
    /// </summary>
    public class TwoWayXsdToJsonSchemaConversionTests
    {
        [Fact]
        public async void ConvertXsdToJsonSchemaAndBack_CorrectNumberOfPropertiesAndDefinitions()
        {
            // string xsdName = "Designer.Tests._TestData.Model.Xsd.schema_3451_8_forms_4106_35721.xsd";
            string xsdName = "Designer.Tests._TestData.Model.Xsd.schema_4581_100_forms_5245_41111.xsd";

            // Arrange
            XmlReader xsdReader = XmlReader.Create(LoadTestData(xsdName));
            XsdToJsonSchema target = new XsdToJsonSchema(xsdReader);

            // Act
            JsonSchema actual = target.AsJsonSchema();

            var serializer = new JsonSerializer();
            JsonValue toar = serializer.Serialize(actual);
            byte[] byteArray = Encoding.UTF8.GetBytes(toar.ToString());
            MemoryStream jsonstream = new MemoryStream(byteArray);
            await WriteData(xsdName + ".json", jsonstream);

            File.WriteAllText(xsdName + ".json", toar.ToString());

            JsonSchemaToXsd jsonSchemaToXsd = new JsonSchemaToXsd();

            XmlSchema xmlschema = jsonSchemaToXsd.CreateXsd(actual);
            MemoryStream xmlStream = new MemoryStream();
            XmlTextWriter xwriter = new XmlTextWriter(xmlStream, new UpperCaseUtf8Encoding());
            xwriter.Formatting = Formatting.Indented;
            xwriter.WriteStartDocument(false);
            xmlschema.Write(xmlStream);
    
            await WriteData(xsdName + ".new", xmlStream);

            Assert.NotNull(actual);
        }

        [Fact]
        public async void ConvertXsdToJsonSchemaAndBackViaString_CorrectNumberOfPropertiesAndDefinitions()
        {
            // string xsdName = "Designer.Tests._TestData.Model.Xsd.schema_3451_8_forms_4106_35721.xsd";
            string xsdName = "Designer.Tests._TestData.Model.Xsd.schema_4581_100_forms_5245_41111.xsd";

            SchemaKeywordCatalog.Add<InfoKeyword>();

            // Arrange
            XmlReader xsdReader = XmlReader.Create(LoadTestData(xsdName));
            XsdToJsonSchema xsdToJsonSchemaConverter = new XsdToJsonSchema(xsdReader);

            // Act
            JsonSchema convertedSchema = xsdToJsonSchemaConverter.AsJsonSchema();

            JsonSerializer serializer = new JsonSerializer();
            JsonValue serializedConvertedSchema = serializer.Serialize(convertedSchema);
            byte[] byteArray = Encoding.UTF8.GetBytes(serializedConvertedSchema.ToString());
            MemoryStream jsonstream = new MemoryStream(byteArray);
            await WriteData(xsdName + ".json", jsonstream);
            File.WriteAllText(xsdName + ".json", serializedConvertedSchema.ToString());

            string savedJsonSchemaFileTextContent = File.ReadAllText(xsdName + ".json");
            TextReader textReader = new StringReader(savedJsonSchemaFileTextContent);
            JsonValue jsonValue = await JsonValue.ParseAsync(textReader);
            JsonSchema jsonSchemaFromFile = new Manatee.Json.Serialization.JsonSerializer().Deserialize<JsonSchema>(jsonValue);

            JsonSchemaToXsd jsonSchemaToXsd = new JsonSchemaToXsd();

            XmlSchema xmlschema = jsonSchemaToXsd.CreateXsd(convertedSchema);
            MemoryStream xmlStream = new MemoryStream();
            XmlTextWriter xwriter = new XmlTextWriter(xmlStream, new UpperCaseUtf8Encoding());
            xwriter.Formatting = Formatting.Indented;
            xwriter.WriteStartDocument(false);
            xmlschema.Write(xmlStream);

            await WriteData(xsdName + ".new", xmlStream);

            XmlSchema xmlschemaFromFile = jsonSchemaToXsd.CreateXsd(jsonSchemaFromFile);
            MemoryStream xmlStreamFile = new MemoryStream();
            XmlTextWriter xwriterFile = new XmlTextWriter(xmlStreamFile, new UpperCaseUtf8Encoding());
            xwriterFile.Formatting = Formatting.Indented;
            xwriterFile.WriteStartDocument(false);
            xmlschemaFromFile.Write(xmlStreamFile);

            await WriteData(xsdName + ".newfile", xmlStreamFile);

            Assert.NotNull(convertedSchema);
        }

        private Stream LoadTestData(string resourceName)
        {
            Assembly assembly = typeof(XsdToJsonSchemaTests).GetTypeInfo().Assembly;
            Stream resource = assembly.GetManifestResourceStream(resourceName);

            if (resource == null)
            {
                throw new InvalidOperationException("Unable to find test data embedded in the test assembly.");
            }

            return resource;
        }

        public async Task WriteData(string filepath, Stream stream)
        {
            stream.Seek(0, SeekOrigin.Begin);
            using (FileStream outputFileStream = new FileStream(filepath, FileMode.Create))
            {
                await stream.CopyToAsync(outputFileStream);
                await outputFileStream.FlushAsync();
            }
        }
    }
}
