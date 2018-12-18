using AltinnCore.Common.Factories.ModelFactory;
using Manatee.Json;
using NJsonSchema;
using NJsonSchema.CodeGeneration.CSharp;
using NJsonSchema.Validation;
using System.IO;
using System.Text;
using System.Xml;
using Xunit;

namespace AltinnCore.UnitTest.Common
{
    public class NJsonSchemaJsonTest
    {

        [Fact]
        public async void generateCSharpFromSchemaTest()
        {
            XsdToJsonSchema converter = new XsdToJsonSchema(new XmlTextReader("Common/Edag.xsd"));
            JsonValue jsonSchemaText = converter.asJsonSchema();

            JsonSchema4 jsonSchema = await JsonSchema4.FromJsonAsync(jsonSchemaText.ToString());

            var settings = new CSharpGeneratorSettings();
            var generator = new CSharpGenerator(jsonSchema, settings);
            var code = generator.GenerateFile();
        }
    }
}
