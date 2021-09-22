using System;
using System.Text;
using System.Threading.Tasks;
using System.Xml;
using System.Xml.Schema;
using Altinn.Studio.DataModeling.Converter.Json;
using Altinn.Studio.DataModeling.Json;
using Altinn.Studio.DataModeling.Json.Keywords;
using DataModeling.Tests.Assertions;
using Json.Schema;
using Xunit;

namespace DataModeling.Tests
{
    public class JsonSchemaToXmlTests
    {
        private static readonly Encoding SafeUtf8 = new UTF8Encoding(false, true);

        private static async Task TestFiles(string schemaPath, string expectedPath)
        {
            var uri = "melding";

            await TestFiles(schemaPath, expectedPath, uri);
        }

        private static async Task TestFiles(string schemaPath, string expectedPath, string uri)
        {
            // Arrange
            JsonSchemaKeywords.RegisterXsdKeywords();

            JsonSchemaToXmlSchemaConverter converter = new JsonSchemaToXmlSchemaConverter(new JsonSchemaNormalizer());

            JsonSchema jsonSchema = await ResourceHelpers.LoadJsonSchemaTestData(schemaPath);
            XmlSchema expected = ResourceHelpers.LoadXmlSchemaTestData(expectedPath);

            // Act
            var schemaUri = new Uri(uri, UriKind.RelativeOrAbsolute);
            XmlSchema actual = converter.Convert(jsonSchema, schemaUri);

            StringBuilder xmlStringBuilder = new StringBuilder();
            await using (XmlWriter xmlWriter = XmlWriter.Create(xmlStringBuilder, new XmlWriterSettings
            {
                Async = true,
                CheckCharacters = true,
                ConformanceLevel = ConformanceLevel.Document,
                Indent = true,
                Encoding = SafeUtf8,
                OmitXmlDeclaration = false
            }))
            {
                actual.Write(xmlWriter);
            }

            string xsd = xmlStringBuilder.ToString();

            // Assert
            XmlSchemaAssertions.IsEquivalentTo(expected, actual);
        }

        [Fact(Skip = "XsdStructureKeyword not supported. We default to sequence, and currently dont' support all. #6888")]
        public async Task SimpleAll()
        {
            await TestFiles("Model/JsonSchema/General/SimpleAll.json", "Model/XmlSchema/General/SimpleAll.xsd", "Root");
        }

        [Fact]
        public async Task AltinnAnnotation()
        {
            await TestFiles("Model/JsonSchema/AltinnAnnotation.json", "Model/XmlSchema/AltinnAnnotation.xsd", string.Empty);
        }

        [Fact(Skip = "Missing support for Any (element). AnyAttribute is implemented. #6885")]
        public async Task Any()
        {
            await TestFiles("Model/JsonSchema/General/Any.json", "Model/XmlSchema/General/Any.xsd", "Root");
        }

        [Fact(Skip = "Unhandled attributes ends up on schema, not on the root element. #6890")]
        public async Task Attributes()
        {
            await TestFiles("Model/JsonSchema/General/Attributes.json", "Model/XmlSchema/General/Attributes.xsd", "Root");
        }

        [Fact]
        public async Task BuiltinTypes()
        {
            await TestFiles("Model/JsonSchema/General/BuiltinTypes.json", "Model/XmlSchema/General/BuiltinTypes.xsd", "Root");
        }

        [Fact(Skip = "Choice not supported for now, and probably won't be because of unecessary complexity.")]
        public async Task SimpleChoice()
        {
            await TestFiles("Model/JsonSchema/SimpleChoice.json", "Model/XmlSchema/SimpleChoice.xsd");
        }

        [Fact(Skip = "Needs analyzing")]
        public async Task NestedChoice()
        {
            await TestFiles("Model/JsonSchema/NestedChoice.json", "Model/XmlSchema/NestedChoice.xsd");
        }

        [Fact(Skip = "Needs analyzing")]
        public async Task NestedArrays()
        {
            await TestFiles("Model/JsonSchema/NestedArrays.json", "Model/XmlSchema/NestedArrays.xsd");
        }

        [Fact(Skip = "Needs analyzing")]
        public async Task NestedWithOptionalChoice()
        {
            await TestFiles("Model/JsonSchema/NestedWithOptionalChoice.json", "Model/XmlSchema/NestedWithOptionalChoice.xsd");
        }

        [Fact(Skip = "Needs analyzing")]
        public async Task NestedWithArrayChoice()
        {
            await TestFiles("Model/JsonSchema/NestedWithArrayChoice.json", "Model/XmlSchema/NestedWithArrayChoice.xsd");
        }

        [Fact(Skip = "Attribute a1 is placed outside the complex content extension ref. #6869")]
        public async Task ComplexContentExtension()
        {
            await TestFiles("Model/JsonSchema/General/ComplexContentExtension.json", "Model/XmlSchema/General/ComplexContentExtension.xsd", "Root");
        }

        [Fact(Skip = "Needs analyzing")]
        public async Task ComplexContentRestriction()
        {
            await TestFiles("Model/JsonSchema/General/ComplexContentRestriction.json", "Model/XmlSchema/General/ComplexContentRestriction.xsd", "Root");
        }

        [Fact(Skip = "Fails to recognize array type and support xsd:list #6891")]
        public async Task ComplexSchema()
        {
            await TestFiles("Model/JsonSchema/General/ComplexSchema.json", "Model/XmlSchema/General/ComplexSchema.xsd", "Root");
        }

        [Fact(Skip = "We currently don't support group element. Ref. #6892")]
        public async Task Definitions()
        {
            await TestFiles("Model/JsonSchema/General/Definitions.json", "Model/XmlSchema/General/Definitions.xsd", "Root");
        }

        [Fact(Skip = "The provided example is an OR schema which is currently not supported.")]
        public async Task ElementAnnotation()
        {
            await TestFiles("Model/JsonSchema/General/ElementAnnotation.json", "Model/XmlSchema/General/ElementAnnotation.xsd", "Root");
        }

        [Fact]
        public async Task SimpleTypeRestrictions()
        {
            await TestFiles("Model/JsonSchema/General/SimpleTypeRestrictions.json", "Model/XmlSchema/General/SimpleTypeRestrictions.xsd", "Root");
        }

        [Fact]
        public async Task SimpleSequence()
        {
            await TestFiles("Model/JsonSchema/General/SimpleSequence.json", "Model/XmlSchema/General/SimpleSequence.xsd", "Root");
        }

        [Fact(Skip = "Nested sequence is currently not supported while maintaing the sequences. #6894")]
        public async Task NestedSequence()
        {
            await TestFiles("Model/JsonSchema/General/NestedSequence.json", "Model/XmlSchema/General/NestedSequence.xsd", "Root");
        }

        [Fact(Skip = "Needs analyzing")]
        public async Task NestedSequences()
        {
            await TestFiles("Model/JsonSchema/NestedSequences.json", "Model/XmlSchema/NestedSequences.xsd");
        }

        [Fact(Skip = "Needs analyzing")]
        public async Task NestedWithOptionalSequence()
        {
            await TestFiles("Model/JsonSchema/NestedWithOptionalSequence.json", "Model/XmlSchema/NestedWithOptionalSequence.xsd");
        }

        [Fact(Skip = "Needs analyzing")]
        public async Task NestedWithArraySequence()
        {
            await TestFiles("Model/JsonSchema/NestedWithArraySequence.json", "Model/XmlSchema/NestedWithArraySequence.xsd");
        }

        [Fact(Skip = "Needs analyzing")]
        public async Task SimpleContentExtension()
        {
            await TestFiles("Model/JsonSchema/SimpleContentExtension.json", "Model/XmlSchema/SimpleContentExtension.xsd");
        }

        [Fact(Skip = "Needs analyzing")]
        public async Task SimpleContentRestriction()
        {
            await TestFiles("Model/JsonSchema/SimpleContentRestriction.json", "Model/XmlSchema/SimpleContentRestriction.fromJson.xsd");
        }

        [Fact(Skip = "Needs analyzing")]
        public async Task SimpleTypeList()
        {
            await TestFiles("Model/JsonSchema/SimpleTypeList.json", "Model/XmlSchema/SimpleTypeList.xsd");
        }
    }
}
