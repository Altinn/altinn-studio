using DataModeling.Tests.Assertions;
using DataModeling.Tests.BaseClasses;
using DataModeling.Tests.TestDataClasses;
using Xunit;

namespace DataModeling.Tests
{
    public class JsonSchemaToXmlTests: SchemaConversionTestsBase<JsonSchemaToXmlTests>
    {
        [Theory]
        [ClassData(typeof(Json2XmlTestData))]
        public void TestJsonSchemaToXml(string jsonPath, string expectedXsdPath)
        {
            Given.That.JsonSchemaLoaded(jsonPath)
                .And.XsdSchemaLoaded(expectedXsdPath)
                .When.LoadedJsonSchemaConvertedToXsdSchema()
                .Then.LoadedAndConvertedXmlSchemasShouldBeEquivalent();
        }

        private void LoadedAndConvertedXmlSchemasShouldBeEquivalent()
        {
            XmlSchemaAssertions.IsEquivalentTo(LoadedXsdSchema, ConvertedXsdSchema);
        }
    }
}
