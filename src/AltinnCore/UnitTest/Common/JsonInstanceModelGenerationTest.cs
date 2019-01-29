using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Xml.Linq;
using AltinnCore.Common.Factories.ModelFactory;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary.ServiceMetadata;
using Manatee.Json;
using Manatee.Json.Schema;
using Manatee.Json.Serialization;
using Moq;
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
            Assert.Equal(158, actualElements.Count);

            string metadataAsJson = instanceModel.ToString();

            File.WriteAllText("edag1.instance-model.json", metadataAsJson);
        }

        /// <summary>
        ///  nokså fantastisk
        /// </summary>
        [Fact]
        public void JsonInstanceFromAutogenJson()
        {
            var schemaText = File.ReadAllText("Common/jsd/melding1.schema.json");
            var schemaJson = JsonValue.Parse(schemaText);
            var schema = new JsonSerializer().Deserialize<JsonSchema>(schemaJson);

            JsonSchemaToInstanceModelGenerator converter = new JsonSchemaToInstanceModelGenerator("TestOrg", "edag", schema);

            JsonObject instanceModel = converter.GetInstanceModel();

            Assert.NotNull(instanceModel);
            JsonObject actualElements = instanceModel.TryGetObject("Elements");
            Assert.Equal(101, actualElements.Count);

            string metadataAsJson = instanceModel.ToString();

            File.WriteAllText("melding1.instance-model.json", metadataAsJson);

            Mock<IRepository> moqRepository = new Mock<IRepository>();
            var seresParser = new SeresXsdParser(moqRepository.Object);
            XDocument mainXsd = XDocument.Load("Common/xsd/ServiceModel.xsd");

            ServiceMetadata serviceMetadata = seresParser.ParseXsdToServiceMetadata("123", "service", mainXsd, null);            

            File.WriteAllText("medling1.element-metadata.json", Newtonsoft.Json.JsonConvert.SerializeObject(serviceMetadata));
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
            Assert.Equal(10, actualElementsAfterExpand.Count);

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
