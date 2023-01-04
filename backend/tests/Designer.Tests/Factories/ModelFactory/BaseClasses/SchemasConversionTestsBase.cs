using System.Diagnostics.CodeAnalysis;
using System.Xml.Schema;
using Altinn.Studio.DataModeling.Converter.Json;
using Altinn.Studio.DataModeling.Converter.Xml;
using Altinn.Studio.DataModeling.Json;
using Altinn.Studio.DataModeling.Json.Formats;
using Altinn.Studio.DataModeling.Json.Keywords;
using Designer.Tests.Utils;
using Json.Schema;
using SharedResources.Tests;

namespace Designer.Tests.Factories.ModelFactory.BaseClasses;

[ExcludeFromCodeCoverage]
public class SchemasConversionTestsBase<TTestType> : FluentTestsBase<TTestType>
    where TTestType : SchemasConversionTestsBase<TTestType>
{
    protected XmlSchema XsdSchema { get; set; }

    protected JsonSchema JsonSchema { get; set; }

    public SchemasConversionTestsBase()
    {
        JsonSchemaKeywords.RegisterXsdKeywords();
        JsonSchemaFormats.RegisterFormats();
    }

    protected TTestType XsdSchemaLoaded(string xsdSchemaPath)
    {
        XsdSchema = TestDataHelper.LoadXmlSchemaTestData(xsdSchemaPath);
        return this as TTestType;
    }

    protected TTestType JsonSchemaLoaded(string resourceName)
    {
        var jsonSchemaText = TestDataHelper.LoadTestDataFromFileAsString(resourceName);
        JsonSchema = JsonSchema.FromText(jsonSchemaText);
        return this as TTestType;
    }

    protected TTestType XsdSchemaConverted2JsonSchema()
    {
        var xsdToJsonConverter = new XmlSchemaToJsonSchemaConverter();
        JsonSchema = xsdToJsonConverter.Convert(XsdSchema);
        return this as TTestType;
    }

    protected TTestType JsonSchemaConvertedToXsdSchema()
    {
        var jsonToXsdConverter = new JsonSchemaToXmlSchemaConverter(new JsonSchemaNormalizer());
        XsdSchema = jsonToXsdConverter.Convert(JsonSchema);
        return this as TTestType;
    }
}
