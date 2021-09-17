using System.IO;
using System.Text;
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
        public SeresConverterTests()
        {
            JsonSchemaKeywords.RegisterXsdKeywords();
        }

        [Theory]
        [InlineData(@"Model\JsonSchema\SeresBasicSchema.json", @"Model\XmlSchema\SeresBasicSchema.xsd")]
        [InlineData(@"Model\JsonSchema\SeresBasicSchema_allOf.json", @"Model\XmlSchema\SeresBasicSchema.xsd")]
        [InlineData(@"Model\JsonSchema\SeresBasicSchema_anyOf.json", @"Model\XmlSchema\SeresBasicSchema.xsd")]
        [InlineData(@"Model\JsonSchema\SeresBasicSchema_inline.json", @"Model\XmlSchema\SeresBasicSchema_inline.xsd")]
        [InlineData(@"Model\JsonSchema\SeresWithAttributes.json", @"Model\XmlSchema\SeresWithAttributes.xsd")]
        [InlineData(@"Model\JsonSchema\SeresWithAnyAttribute.json", @"Model\XmlSchema\SeresWithAnyAttribute.xsd")]
        [InlineData(@"Model\JsonSchema\SeresWithSpecifiedAndAnyAttributes.json", @"Model\XmlSchema\SeresWithSpecifiedAndAnyAttributes.xsd")]
        [InlineData(@"Model\JsonSchema\SeresComplexContentExtension.json", @"Model\XmlSchema\SeresComplexContentExtension.xsd")]
        [InlineData(@"Model\JsonSchema\SimpleContentExtensionPlain.json", @"Model\XmlSchema\SimpleContentExtensionPlain.xsd")]
        [InlineData(@"Model\JsonSchema\SeresBuiltinTypes.json", @"Model\XmlSchema\SeresBuiltinTypes.xsd")]
        [InlineData(@"Model\JsonSchema\SeresComplexType.json", @"Model\XmlSchema\SeresComplexType.xsd")]
        [InlineData(@"Model\JsonSchema\SeresArray.json", @"Model\XmlSchema\SeresArray.xsd")]
        [InlineData(@"Model\JsonSchema\SeresSimpleTypeRestrictions.json", @"Model\XmlSchema\SeresSimpleTypeRestrictions.xsd")]
        [InlineData(@"Model\JsonSchema\SeresSimpleContentRestriction.json", @"Model\XmlSchema\SeresSimpleContentRestriction.fromJson.xsd")]
        public async Task Convert_SeresBasicSchema(string jsonPath, string xsdPath)
        {
            var expectedXsd = ResourceHelpers.LoadXmlSchemaTestData(xsdPath);

            System.Xml.Schema.XmlSchema actualXsd = await ConvertJsonSchema(jsonPath);

            string actualXml = await Serialize(actualXsd);

            XmlSchemaAssertions.IsEquivalentTo(expectedXsd, actualXsd);
        }

        private static async Task<System.Xml.Schema.XmlSchema> ConvertJsonSchema(string jsonPath)
        {
            var jsonSchema = await ResourceHelpers.LoadJsonSchemaTestData(jsonPath);
            var converter = new JsonSchemaToXmlSchemaConverter(new JsonSchemaNormalizer());

            var actualXsd = converter.Convert(jsonSchema);

            return actualXsd;
        }

        private static async Task<string> Serialize(System.Xml.Schema.XmlSchema actualXsd)
        {
            string actualXml;
            await using (var sw = new Utf8StringWriter())
            await using (var xw = XmlWriter.Create(sw, new XmlWriterSettings { Indent = true, Async = true }))
            {
                actualXsd.Write(xw);
                actualXml = sw.ToString();
            }

            return actualXml;
        }
    }

    internal class Utf8StringWriter : StringWriter
    {
        public override Encoding Encoding => Encoding.UTF8;
    }
}
