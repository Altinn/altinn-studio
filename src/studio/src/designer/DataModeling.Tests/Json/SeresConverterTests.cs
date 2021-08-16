using System.IO;
using System.Threading.Tasks;
using System.Xml;
using Altinn.Studio.DataModeling.Converter.Json;
using Altinn.Studio.DataModeling.Json;
using Altinn.Studio.DataModeling.Json.Keywords;
using DataModeling.Tests.Assertions;
using FluentAssertions;
using Xunit;

namespace DataModeling.Tests.Json
{
    public class SeresConverterTests
    {
        [Theory]
        [InlineData(@"Model\JsonSchema\SeresBasicSchema.json", @"Model\XmlSchema\SeresBasicSchema.xsd")]
        [InlineData(@"Model\JsonSchema\SeresBasicSchema_allOf.json", @"Model\XmlSchema\SeresBasicSchema.xsd")]
        [InlineData(@"Model\JsonSchema\SeresBasicSchema_anyOf.json", @"Model\XmlSchema\SeresBasicSchema.xsd")]
        [InlineData(@"Model\JsonSchema\SeresBasicSchema_inline.json", @"Model\XmlSchema\SeresBasicSchema.xsd", Skip = "Does not support this yet")]
        public async Task Convert_SeresBasicSchema(string jsonPath, string xsdPath)
        {
            JsonSchemaKeywords.RegisterXsdKeywords();

            var expected = ResourceHelpers.LoadXmlSchemaTestData(xsdPath);

            var schema = await ResourceHelpers.LoadJsonSchemaTestData(jsonPath);
            var converter = new JsonSchemaToXmlSchemaConverter(new JsonSchemaNormalizer());

            var actual = converter.Convert(schema);

            string actualXml;
            await using (var sw = new StringWriter())
            await using (var xw = XmlWriter.Create(sw, new XmlWriterSettings { Indent = true, Async = true }))
            {
                actual.Write(xw);
                actualXml = sw.ToString();
            }

            XmlSchemaAssertions.IsEquivalentTo(expected, actual);
        }
    }
}
