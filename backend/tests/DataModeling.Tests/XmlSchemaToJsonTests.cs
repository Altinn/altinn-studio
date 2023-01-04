using DataModeling.Tests.Assertions;
using DataModeling.Tests.BaseClasses;
using DataModeling.Tests.TestDataClasses;
using Xunit;
using Xunit.Abstractions;

namespace DataModeling.Tests
{
    public class XmlSchemaToJsonTests: SchemaConversionTestsBase<XmlSchemaToJsonTests>
    {
        private readonly ITestOutputHelper _testOutputHelper;

        public XmlSchemaToJsonTests(ITestOutputHelper testOutputHelper)
        {
            _testOutputHelper = testOutputHelper;
        }

        [Theory]
        [ClassData(typeof(Xml2JsonTestData))]
        public void XmlSchema_to_JsonSchema_Converter(string schemaPath, string expectedPath, string testCase)
        {
            _testOutputHelper.WriteLine(testCase);

            Given.That.XsdSchemaLoaded(schemaPath)
                .And.JsonSchemaLoaded(expectedPath)
                .When.LoadedXsdSchemaConvertedToJsonSchema()
                .Then.LoadedAndConvertedJsonSchemasShouldBeEquivalent();
        }

        private void LoadedAndConvertedJsonSchemasShouldBeEquivalent()
        {
            JsonSchemaAssertions.IsEquivalentTo(LoadedJsonSchema, ConvertedJsonSchema);
        }
    }
}
