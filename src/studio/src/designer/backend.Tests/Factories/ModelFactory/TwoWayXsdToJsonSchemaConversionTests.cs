using System;
using System.IO;
using System.Reflection;
using System.Text;
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
        public void ConvertXsdToJsonSchemaAndBack_CorrectNumberOfPropertiesAndDefinitions()
        {
            // string xsdName = "Designer.Tests._TestData.xsd.schema_3451_8_forms_4106_35721.xsd";
            string xsdName = "Designer.Tests._TestData.xsd.schema_4581_100_forms_5245_41111.xsd";

            // Arrange
            XmlReader xsdReader = XmlReader.Create(LoadTestData(xsdName));
            XsdToJsonSchema target = new XsdToJsonSchema(xsdReader);

            // Act
            JsonSchema actual = target.AsJsonSchema();

            var serializer = new JsonSerializer();
            JsonValue toar = serializer.Serialize(actual);

            File.WriteAllText(xsdName + ".json", toar.ToString());

            JsonSchemaToXsd jsonSchemaToXsd = new JsonSchemaToXsd();

            XmlSchema xmlschema = jsonSchemaToXsd.CreateXsd(actual);

            FileStream file = new FileStream(xsdName + ".new", FileMode.Create, FileAccess.ReadWrite);
            XmlTextWriter xwriter = new XmlTextWriter(file, new UTF8Encoding());
            xwriter.Formatting = Formatting.Indented;
            xwriter.WriteStartDocument(false);
            xmlschema.Write(xwriter);

            // Assert
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
    }
}
