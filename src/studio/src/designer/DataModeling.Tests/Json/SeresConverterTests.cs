using System.IO;
using System.Threading.Tasks;
using System.Xml;
using Altinn.Studio.DataModeling.Converter.Json;
using Altinn.Studio.DataModeling.Json;
using Altinn.Studio.DataModeling.Json.Keywords;
using DataModeling.Tests.Assertions;
using Xunit;

namespace DataModeling.Tests.Json
{
    public class SeresConverterTests
    {
        [Theory]
        [InlineData(@"Model\JsonSchema\SeresBasicSchema.json", @"Model\XmlSchema\SeresBasicSchema.xsd")]
        [InlineData(@"Model\JsonSchema\SeresBasicSchema_allOf.json", @"Model\XmlSchema\SeresBasicSchema.xsd")]
        [InlineData(@"Model\JsonSchema\SeresBasicSchema_anyOf.json", @"Model\XmlSchema\SeresBasicSchema.xsd")]
        [InlineData(@"Model\JsonSchema\SeresBasicSchema_inline.json", @"Model\XmlSchema\SeresBasicSchema_inline.xsd")]
        public async Task Convert_SeresBasicSchema(string jsonPath, string xsdPath)
        {
            JsonSchemaKeywords.RegisterXsdKeywords();

            var expectedXsd = ResourceHelpers.LoadXmlSchemaTestData(xsdPath);

            var jsonSchema = await ResourceHelpers.LoadJsonSchemaTestData(jsonPath);
            var converter = new JsonSchemaToXmlSchemaConverter(new JsonSchemaNormalizer());

            var actualXsd = converter.Convert(jsonSchema);

            string actualXml;
            await using (var sw = new StringWriter())
            await using (var xw = XmlWriter.Create(sw, new XmlWriterSettings { Indent = true, Async = true }))
            {
                actualXsd.Write(xw);
                actualXml = sw.ToString();
            }

            XmlSchemaAssertions.IsEquivalentTo(expectedXsd, actualXsd);
        }
    }
}
