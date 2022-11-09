using System;
using System.IO;
using System.Reflection;
using System.Text;
using System.Text.RegularExpressions;
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
        public async void ConvertXsdToJsonSchema_CorrectXmlParsed()
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
            assembly.CreateInstance(type.FullName);

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

            Stream classStream = TestDataHelper.LoadDataFromEmbeddedResource("Designer.Tests._TestData.Model.CSharp.Brønnøysundregistrene_ReelleRettighetshavere_M_2021-11-22_6900_46864_SERES.expected.csharp.txt");

            StreamReader classReader = new StreamReader(classStream);
            string orgClasses = classReader.ReadToEnd();

            // Assert
            Assert.NotNull(modelMetadata);
            Assert.Contains($"[XmlElement(\"reelleRettigheter\", Order = 2)]", classes);
            string expectedTextSanitized = Regex.Replace(textOrgXml, @">(\s+)<", "><");
            var actualTextSanitized = Regex.Replace(text, @">(\s+)<", "><");
            Assert.Equal(expectedTextSanitized, actualTextSanitized);
            string expectedClassesSanitized = Regex.Replace(orgClasses, @"\s+", string.Empty);
            string actualClassesSanitized = Regex.Replace(classes, @"\s+", string.Empty);
            Assert.Equal(expectedClassesSanitized, actualClassesSanitized);
        }

        private static string GenerateCSharpClasses(ModelMetadata modelMetadata)
        {
            JsonMetadataParser modelGenerator = new JsonMetadataParser();
            string classes = modelGenerator.CreateModelFromMetadata(modelMetadata);
            return classes;
        }

        private static Stream LoadTestData(string resourceName)
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(XsdToJsonSchemaTests).Assembly.Location).LocalPath);
            string resourcePath = Path.Combine(unitTestFolder, "..", "..", "..", "_TestData", resourceName);
            Stream resource = File.OpenRead(resourcePath);

            if (resource == null)
            {
                throw new InvalidOperationException("Unable to find test data.");
            }

            return resource;
        }

        private static async Task<object> DeserializeXmlAsync(Stream stream, Type type)
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
