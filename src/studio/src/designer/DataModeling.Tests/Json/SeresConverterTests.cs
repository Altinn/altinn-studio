using System.IO;
using System.Text;
using System.Threading.Tasks;
using System.Xml;
using System.Xml.Schema;

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
        [InlineData(@"Model\JsonSchema\Seres\SeresBasicSchema.json", @"Model\XmlSchema\Seres\SeresBasicSchema.xsd")]
        [InlineData(@"Model\JsonSchema\Seres\SeresBasicSchema_allOf.json", @"Model\XmlSchema\Seres\SeresBasicSchema.xsd")]
        [InlineData(@"Model\JsonSchema\Seres\SeresBasicSchema_anyOf.json", @"Model\XmlSchema\Seres\SeresBasicSchema.xsd")]
        [InlineData(@"Model\JsonSchema\Seres\SeresBasicSchema_inline.json", @"Model\XmlSchema\Seres\SeresBasicSchema_inline.xsd")]
        [InlineData(@"Model\JsonSchema\Seres\SeresWithAttributes.json", @"Model\XmlSchema\Seres\SeresWithAttributes.xsd")]
        [InlineData(@"Model\JsonSchema\Seres\SeresWithAnyAttribute.json", @"Model\XmlSchema\Seres\SeresWithAnyAttribute.xsd")]
        [InlineData(@"Model\JsonSchema\Seres\SeresWithSpecifiedAndAnyAttributes.json", @"Model\XmlSchema\Seres\SeresWithSpecifiedAndAnyAttributes.xsd")]
        [InlineData(@"Model\JsonSchema\Seres\SeresComplexContentExtension.json", @"Model\XmlSchema\Seres\SeresComplexContentExtension.xsd")]
        [InlineData(@"Model\JsonSchema\General\SimpleContentExtensionPlain.json", @"Model\XmlSchema\General\SimpleContentExtensionPlain.xsd")]
        [InlineData(@"Model\JsonSchema\Seres\SeresBuiltinTypes.json", @"Model\XmlSchema\Seres\SeresBuiltinTypes.xsd")]
        [InlineData(@"Model\JsonSchema\Seres\SeresComplexType.json", @"Model\XmlSchema\Seres\SeresComplexType.xsd")]
        [InlineData(@"Model\JsonSchema\Seres\SeresArray.json", @"Model\XmlSchema\Seres\SeresArray.xsd")]
        [InlineData(@"Model\JsonSchema\Seres\SeresSimpleTypeRestrictions.json", @"Model\XmlSchema\Seres\SeresSimpleTypeRestrictions.xsd")]
        [InlineData(@"Model\JsonSchema\Seres\SeresSimpleContentRestriction.json", @"Model\XmlSchema\Seres\SeresSimpleContentRestriction.fromJson.xsd")]
        public async Task Convert_SeresBasicSchema(string jsonPath, string xsdPath)
        {
            var expectedXsd = ResourceHelpers.LoadXmlSchemaTestData(xsdPath);

            XmlSchema actualXsd = await ConvertJsonSchema(jsonPath);

            string actualXml = await Serialize(actualXsd);

            XmlSchemaAssertions.IsEquivalentTo(expectedXsd, actualXsd);
        }

        private static async Task<XmlSchema> ConvertJsonSchema(string jsonPath)
        {
            var jsonSchema = await ResourceHelpers.LoadJsonSchemaTestData(jsonPath);
            var converter = new JsonSchemaToXmlSchemaConverter(new JsonSchemaNormalizer());

            var actualXsd = converter.Convert(jsonSchema);

            return actualXsd;
        }

        private static async Task<string> Serialize(XmlSchema actualXsd)
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
