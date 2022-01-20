using System;
using System.IO;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;
using System.Xml;
using System.Xml.Serialization;
using Altinn.Studio.Designer.Factories.ModelFactory;
using Altinn.Studio.Designer.ModelMetadatalModels;
using Designer.Tests.Utils;
using Manatee.Json.Schema;
using Xunit;

namespace Designer.Tests.Factories.ModelFactory
{
    public class XsdToCSharpTests
    {
        [Fact]
        public async void ConvertXsdToJsonSchema_CorrectNumberOfPropertiesAndDefinitions()
        {
            // Arrange
            using XmlReader xsdReader = XmlReader.Create(LoadTestData("Model/Xsd/Brønnøysundregistrene_ReelleRettighetshavere_M_2021-11-22_6900_46864_SERES.xsd"));
            XsdToJsonSchema target = new XsdToJsonSchema(xsdReader);

            // Act
            JsonSchema xsdasJsonSchema = target.AsJsonSchema();

            JsonSchemaToInstanceModelGenerator converter = new JsonSchemaToInstanceModelGenerator("test", "test", xsdasJsonSchema);
            ModelMetadata modelMetadata = converter.GetModelMetadata();

            string classes = GenerateCSharpClasses(modelMetadata);
            Assembly assembly = Compiler.CompileToAssembly(classes);
            Type type = assembly.GetType("Altinn.App.Models.ReelleRettighetshavere_M");
            var modelInstance = assembly.CreateInstance(type.FullName);

            Stream xmlStream = TestDataHelper.LoadDataFromEmbeddedResource("Designer.Tests._TestData.ModelData.Brønnøysundregistrene_ReelleRettighetshavere_M_2021-11-22_6900_46864_SERES.CorrectOrder.xml");

            var xmlObject = await DeserializeXmlAsync(xmlStream, type);

            XmlSerializer serializer = new XmlSerializer(type);
            using MemoryStream stream = new MemoryStream();
            serializer.Serialize(stream, xmlObject);
            stream.Position = 0;

            StreamReader reader = new StreamReader(stream);
            string text = reader.ReadToEnd();

            xmlStream = TestDataHelper.LoadDataFromEmbeddedResource("Designer.Tests._TestData.ModelData.Brønnøysundregistrene_ReelleRettighetshavere_M_2021-11-22_6900_46864_SERES.CorrectOrder.xml");
            StreamReader orgXmlReader = new StreamReader(xmlStream);
            string textOrgXml = orgXmlReader.ReadToEnd();

            // Assert
            Assert.NotNull(modelMetadata);
            Assert.Contains($"[XmlElement(\"reelleRettigheter\", Order = 2)]", classes);

            Assert.Equal(text, textOrgXml);
        }

        [Fact]
        public async void ConvertXsdToCSharp_LoadXMLIncorrectOrder()
        {
            // Arrange
            using XmlReader xsdReader = XmlReader.Create(LoadTestData("Model/Xsd/Brønnøysundregistrene_ReelleRettighetshavere_M_2021-11-22_6900_46864_SERES.xsd"));
            XsdToJsonSchema target = new XsdToJsonSchema(xsdReader);

            // Act
            JsonSchema xsdasJsonSchema = target.AsJsonSchema();

            JsonSchemaToInstanceModelGenerator converter = new JsonSchemaToInstanceModelGenerator("test", "test", xsdasJsonSchema);
            ModelMetadata modelMetadata = converter.GetModelMetadata();

            string classes = GenerateCSharpClasses(modelMetadata);
            Assembly assembly = Compiler.CompileToAssembly(classes);
            Type type = assembly.GetType("Altinn.App.Models.ReelleRettighetshavere_M");
            var modelInstance = assembly.CreateInstance(type.FullName);

            Stream xmlStream = TestDataHelper.LoadDataFromEmbeddedResource("Designer.Tests._TestData.ModelData.Brønnøysundregistrene_ReelleRettighetshavere_M_2021-11-22_6900_46864_SERES.IncorrectOrder.xml");

            var xmlObject = await DeserializeXmlAsync(xmlStream, type);

            XmlSerializer serializer = new XmlSerializer(type);
            using MemoryStream stream = new MemoryStream();
            serializer.Serialize(stream, xmlObject);
            stream.Position = 0;

            StreamReader reader = new StreamReader(stream);
            string text = reader.ReadToEnd();

            xmlStream = TestDataHelper.LoadDataFromEmbeddedResource("Designer.Tests._TestData.ModelData.Brønnøysundregistrene_ReelleRettighetshavere_M_2021-11-22_6900_46864_SERES.IncorrectOrder.xml");
            StreamReader orgXmlReader = new StreamReader(xmlStream);
            string textOrgXml = orgXmlReader.ReadToEnd();

            // Assert
            Assert.NotNull(modelMetadata);
            Assert.Contains($"[XmlElement(\"reelleRettigheter\", Order = 2)]", classes);
            Assert.NotEqual(text, textOrgXml);
        }

        private static string GenerateCSharpClasses(ModelMetadata modelMetadata)
        {
            JsonMetadataParser modelGenerator = new JsonMetadataParser();
            string classes = modelGenerator.CreateModelFromMetadata(modelMetadata);
            return classes;
        }

        private Stream LoadTestData(string resourceName)
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(XsdToJsonSchemaTests).Assembly.Location).LocalPath);
            unitTestFolder = Path.Combine(unitTestFolder, @"..\..\..\_TestData\");
            Stream resource = File.OpenRead(unitTestFolder + resourceName);

            if (resource == null)
            {
                throw new InvalidOperationException("Unable to find test data.");
            }

            return resource;
        }

        private async Task<object> DeserializeXmlAsync(Stream stream, Type type)
        {
            string streamContent = null;
            using StreamReader reader = new StreamReader(stream, Encoding.UTF8);
            streamContent = await reader.ReadToEndAsync();

            using XmlTextReader xmlTextReader = new XmlTextReader(new StringReader(streamContent));
            XmlSerializer serializer = new XmlSerializer(type);

            return serializer.Deserialize(xmlTextReader);
        }
    }
}
