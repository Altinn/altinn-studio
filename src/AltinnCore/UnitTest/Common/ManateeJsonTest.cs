using System;
using System.IO;
using System.Text;
using Manatee.Json;
using Manatee.Json.Schema;
using Manatee.Json.Serialization;
using Xunit;

namespace AltinnCore.UnitTest.Common
{
    /// <summary>
    /// Manatee Json-related tests
    /// </summary>
    public class ManateeJsonTest
    {
        /// <summary>
        /// Test loading Json Schema
        /// </summary>
        [Fact]
        public void LoadJsonSchemaTest()
        {
            JsonSchema jsonSchema;
            using (StreamReader streamReader = new StreamReader("Common/example.schema.json", Encoding.UTF8))
            {
                jsonSchema = new JsonSchema();
                jsonSchema.FromJson(JsonValue.Parse(streamReader.ReadToEnd()), new JsonSerializer());
            }

            JsonValue jsonInstance;
            using (StreamReader streamReader = new StreamReader("Common/example.json", Encoding.UTF8))
            {
                jsonInstance = JsonValue.Parse(streamReader.ReadToEnd());
            }

            // Test schema
            var schemaValidationResults = jsonSchema.ValidateSchema();
            Assert.True(schemaValidationResults.IsValid);
            Assert.Empty(schemaValidationResults.OtherErrors);

            // Test instance
            var validationResults = jsonSchema.Validate(jsonInstance);
            Assert.True(validationResults.IsValid);
        }
    }
}
