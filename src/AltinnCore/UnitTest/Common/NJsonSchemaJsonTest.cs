using System.IO;
using System.Text;
using System.Xml;
using AltinnCore.Common.Factories.ModelFactory;
using Manatee.Json;
using NJsonSchema;
using NJsonSchema.CodeGeneration.CSharp;
using NJsonSchema.Validation;
using Xunit;

namespace AltinnCore.UnitTest.Common
{
    /// <summary>
    /// NJsonSchema Json-related tests
    /// </summary>
    public class NJsonSchemaJsonTest
    {
        /*
        /// <summary>
        /// Test generating C# code from Json Schema (converted from XSD)
        /// </summary>
        [Fact]
        public async void GenerateCSharpFromSchemaTest()
        {
            XsdToJsonSchema converter = new XsdToJsonSchema(new XmlTextReader("Common/Edag.xsd"));
            JsonValue jsonSchemaText = converter.AsJsonSchema();

            JsonSchema4 jsonSchema = await JsonSchema4.FromJsonAsync(jsonSchemaText.ToString());

            var settings = new CSharpGeneratorSettings();
            var generator = new CSharpGenerator(jsonSchema, settings);
            var code = generator.GenerateFile();
        }
        */
        }
}
