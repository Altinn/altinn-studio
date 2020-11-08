using System;
using System.IO;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;
using System.Xml;
using System.Xml.Schema;
using Altinn.Studio.Designer.Factories.ModelFactory;
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
            XmlTextWriter xwriter = new XmlTextWriter(xmlStream, new UpperCaseUTF8Encoding());
            xwriter.Formatting = Formatting.Indented;
            xwriter.WriteStartDocument(false);
            xmlschema.Write(xmlStream);
    
            await WriteData(xsdName + ".new", xmlStream);

            Assert.NotNull(actual);
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
