using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Xml;
using System.Xml.Linq;
using AltinnCore.Common.Factories.ModelFactory;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary.ServiceMetadata;
using Manatee.Json;
using Manatee.Json.Schema;
using Manatee.Json.Serialization;
using Moq;
using NUnit.Framework;
using Xunit;

namespace AltinnCore.UnitTest.Common
{
    /// <summary>
    ///   a bloddy test class to test you know
    /// </summary>
    public class JsonInstanceModelGenerationTest
    {
        /// <summary>
        ///  fantastisk
        /// </summary>
        [Fact]
        public void JsonInstanceModel()
        {
            var schemaText = File.ReadAllText("Common/jsd/edag1.schema.json");
            var schemaJson = JsonValue.Parse(schemaText);
            var schema = new JsonSerializer().Deserialize<JsonSchema>(schemaJson);

            JsonSchemaToInstanceModelGenerator converter = new JsonSchemaToInstanceModelGenerator("TestOrg", "edag", schema);

            JsonObject instanceModel = converter.GetInstanceModel();

            Assert.NotNull(instanceModel);
            JsonObject actualElements = instanceModel.TryGetObject("Elements");
            Assert.Equal(410, actualElements.Count);

            string metadataAsJson = instanceModel.ToString();

            File.WriteAllText("edag1.instance-model.json", metadataAsJson);
        }

        /// <summary>
        ///  fantastisk
        /// </summary>
        [Fact]
        public void TextGenerationOk()
        {
            var schemaText = File.ReadAllText("Common/jsd/service-model.schema.json");
            var schemaJson = JsonValue.Parse(schemaText);
            var schema = new JsonSerializer().Deserialize<JsonSchema>(schemaJson);

            JsonSchemaToInstanceModelGenerator converter = new JsonSchemaToInstanceModelGenerator("TestOrg", "ServiceModel", schema);

            JsonObject instanceModel = converter.GetInstanceModel();

            Assert.NotNull(instanceModel);
            JsonObject actualElements = instanceModel.TryGetObject("Elements");

            // Assert.Equal(410, actualElements.Count);

            string metadataAsJson = instanceModel.GetIndentedString();

            File.WriteAllText("service-model.instance-model.json", metadataAsJson);

            JsonSerializer json = new JsonSerializer();
            Dictionary<string, Dictionary<string, string>> textDictionary = new Dictionary<string, Dictionary<string, string>>();
            Mock<IRepository> moqRepository = new Mock<IRepository>();
            moqRepository
                .Setup(r => r.GetServiceTexts(It.IsAny<string>(), It.IsAny<string>())).Returns(textDictionary);
            ServiceMetadata serviceMetadata = SeresXSDParse(moqRepository, "Common/xsd/ServiceModel.xsd");
            JsonValue serviceMetadataValue = json.Serialize<ServiceMetadata>(serviceMetadata);
            File.WriteAllText("service-model.instance-model.old.json", serviceMetadataValue.GetIndentedString());

            SortedDictionary<string, Dictionary<string, string>> oldTexts = new SortedDictionary<string, Dictionary<string, string>>(textDictionary);
            SortedDictionary<string, Dictionary<string, string>> newTexts = new SortedDictionary<string, Dictionary<string, string>>(converter.GetTexts());
            
            File.WriteAllText("service-model.texts.old.json", json.Serialize(new Dictionary<string, Dictionary<string, string>>(oldTexts)).GetIndentedString());
            File.WriteAllText("service-model.texts.json", json.Serialize(new Dictionary<string, Dictionary<string, string>>(newTexts)).GetIndentedString());
        }
        
        /// <summary>
        ///  nokså fantastisk
        /// </summary>
        [Fact]
        public void JsonInstanceFromAutogenJson()
        {
            Mock<IRepository> moqRepository = new Mock<IRepository>();

            int failCount = 0;
            int mismatchCount = 0;

            string[] files = Directory.GetFiles("Common/xsd", "*.xsd", SearchOption.AllDirectories);

            foreach (string file in files)
            {
                try
                {
                    // XSD to Json Schema metadata
                    XsdToJsonSchema xsdToJsonSchemaConverter = new XsdToJsonSchema(new XmlTextReader(file), TestLogger.Create<XsdToJsonSchema>());
                    JsonSchema schemaJsonSchema = xsdToJsonSchemaConverter.AsJsonSchema();

                    JsonSchemaToInstanceModelGenerator converter = new JsonSchemaToInstanceModelGenerator("org", "service", schemaJsonSchema, string.Empty);
                    JsonObject instanceModel = converter.GetInstanceModel();

                    // XSD to Json Schema metadata using obsolete SeresXsdParser
                    ServiceMetadata serviceMetadata = SeresXSDParse(moqRepository, file);
                    JsonValue serviceMetadataValue = new JsonSerializer().Serialize<ServiceMetadata>(serviceMetadata);

                    if (!instanceModel["Elements"].Equals(serviceMetadataValue.Object["Elements"]))
                    {
                        mismatchCount++;
                        File.WriteAllText(file + ".new.schema.json", instanceModel.GetIndentedString(0));
                        File.WriteAllText(file + ".seresParser.schema.json", serviceMetadataValue.GetIndentedString(0));
                    }
                }
                catch (Exception e)
                {
                    failCount++;
                }
            }

            /*Assert.Equal(0, failCount + mismatchCount);*/
        }

        private static ServiceMetadata SeresXSDParse(Mock<IRepository> moqRepository, string file)
        {
            SeresXsdParser seresParser = new SeresXsdParser(moqRepository.Object);
            XDocument mainXsd = XDocument.Load(file);
            ServiceMetadata serviceMetadata = seresParser.ParseXsdToServiceMetadata("org", "service", mainXsd, null);
            return serviceMetadata;
        }

        /// <summary>
        ///  Tests a recursive schema and expand/remove path. Happy days!
        /// </summary>
        [Fact]
        public void JsonInstanceModelOfRecursiveSchema()
        {
            var schemaText = File.ReadAllText("Common/jsd/schema-w-recursion.schema.json");
            var schemaJson = JsonValue.Parse(schemaText);
            var schema = new JsonSerializer().Deserialize<JsonSchema>(schemaJson);

            // test recursive schema
            JsonSchemaToInstanceModelGenerator converter = new JsonSchemaToInstanceModelGenerator("TestOrg", "edag", schema);
            JsonObject instanceModel = converter.GetInstanceModel();

            Assert.NotNull(instanceModel);
            JsonObject actualElements = instanceModel.TryGetObject("Elements");
            Assert.Equal(6, actualElements.Count);

            // test expand path
            string path = "melding.ansatte[*].foresatt[*]";
            JsonObject instanceModelAfterExpand = converter.ExpandPath(path);
            JsonObject actualElementsAfterExpand = instanceModelAfterExpand.TryGetObject("Elements");
            JsonObject nameElement = actualElementsAfterExpand.TryGetObject(path + ".navn");
            Assert.NotNull(nameElement);
            Assert.Equal(18, actualElementsAfterExpand.Count);

            // test remove path
            JsonObject modelAfterRemovePath = converter.RemovePath(path);
            JsonObject actualElementsAfterRemove = modelAfterRemovePath.TryGetObject("Elements");
            JsonObject missingNameElement = actualElementsAfterRemove.TryGetObject(path + ".navn");
            Assert.Null(missingNameElement);
            Assert.Equal(6, actualElementsAfterRemove.Count);

            /* File.WriteAllText("schema-w-recursion-remove-path.instance-model.json", modelAfterRemovePath.ToString());*/
        }

        /// <summary>
        ///  Tests a recursive schema and expand/remove path operations with wrong input!
        /// </summary>
        [Fact]
        public void JsonInstanceModelWithWrongPathInput()
        {
            var schemaText = File.ReadAllText("Common/jsd/schema-w-recursion.schema.json");
            var schemaJson = JsonValue.Parse(schemaText);
            var schema = new JsonSerializer().Deserialize<JsonSchema>(schemaJson);

            // test recursive schema
            JsonSchemaToInstanceModelGenerator converter = new JsonSchemaToInstanceModelGenerator("TestOrg", "edag", schema);
            JsonObject instanceModel = converter.GetInstanceModel();

            Assert.NotNull(instanceModel);
            JsonObject actualElements = instanceModel.TryGetObject("Elements");
            Assert.Equal(6, actualElements.Count);

            // test expand path with wrong path
            string path = "melding.ansatte[*].foresatt[*].wronginput[*]";
            try
            {
                JsonObject instanceModelAfterExpand = converter.ExpandPath(path);
            }
            catch (Exception e)
            {
                Assert.Equal("Path does not exist in instance model", e.Message);
            }

            // test expand path which cannot be expanded
            path = "melding.ansatte[*].navn";
            try
            {
                JsonObject instanceModelAfterExpand = converter.ExpandPath(path);
            }
            catch (Exception e)
            {
                Assert.StartsWith("Path cannot be expanded", e.Message);
            }

            // test expand path of already expanded path
            path = "melding.ansatte[*]";
            try
            {
                JsonObject instanceModelAfterExpand = converter.ExpandPath(path);
            }
            catch (Exception e)
            {
                Assert.StartsWith("Path already expanded", e.Message);
            }
        }
    }
}
