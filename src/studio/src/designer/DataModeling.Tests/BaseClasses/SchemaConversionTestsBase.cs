using System.Diagnostics.CodeAnalysis;
using System.IO;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Unicode;
using System.Threading.Tasks;
using System.Xml;
using System.Xml.Schema;
using Altinn.Studio.DataModeling.Converter.Json;
using Altinn.Studio.DataModeling.Converter.Xml;
using Altinn.Studio.DataModeling.Json;
using Altinn.Studio.DataModeling.Json.Formats;
using Altinn.Studio.DataModeling.Json.Keywords;
using Json.Schema;

namespace DataModeling.Tests.BaseClasses;

[ExcludeFromCodeCoverage]
public abstract class SchemaConversionTestsBase<TTestType> : FluentTestsBase<TTestType>
    where TTestType : class
{
    protected XmlSchema LoadedXsdSchema { get; set; }

    protected XmlSchema ConvertedXsdSchema { get; set; }

    protected JsonSchema LoadedJsonSchema { get; set; }

    protected JsonSchema ConvertedJsonSchema { get; set; }

    protected SchemaConversionTestsBase()
    {
        JsonSchemaKeywords.RegisterXsdKeywords();
        JsonSchemaFormats.RegisterFormats();
    }

    protected TTestType XsdSchemaLoaded(string xsdSchemaPath)
    {
        LoadedXsdSchema = ResourceHelpers.LoadXmlSchemaTestData(xsdSchemaPath);
        return this as TTestType;
    }

    protected TTestType LoadedXsdSchemaConvertedToJsonSchema()
    {
        var xsdToJsonConverter = new XmlSchemaToJsonSchemaConverter();
        ConvertedJsonSchema = xsdToJsonConverter.Convert(LoadedXsdSchema);
        return this as TTestType;
    }

    protected TTestType JsonSchemaLoaded(string jsonSchemaPath)
    {
        LoadedJsonSchema = ResourceHelpers.LoadJsonSchemaTestData(jsonSchemaPath);
        return this as TTestType;
    }

    protected TTestType ConvertedJsonSchemaConvertedToXsdSchema()
    {
        var jsonToXsdConverter = new JsonSchemaToXmlSchemaConverter(new JsonSchemaNormalizer());
        ConvertedXsdSchema = jsonToXsdConverter.Convert(ConvertedJsonSchema);
        return this as TTestType;
    }

    protected TTestType LoadedJsonSchemaConvertedToXsdSchema()
    {
        var jsonToXsdConverter = new JsonSchemaToXmlSchemaConverter(new JsonSchemaNormalizer());
        ConvertedXsdSchema = jsonToXsdConverter.Convert(LoadedJsonSchema);
        return this as TTestType;
    }

    // Debug helper methods
    protected static async Task<string> SerializeXsdSchemaAsync(XmlSchema xmlSchema)
    {
        await using var sw = new StringWriter();
        await using var xw = XmlWriter.Create(sw, new XmlWriterSettings { Indent = true, Async = true });
        xmlSchema.Write(xw);
        return sw.ToString();
    }

    protected static string SerializeJsonSchemaAsync(JsonSchema schema) =>
        JsonSerializer.Serialize(schema, new JsonSerializerOptions
        {
            Encoder = JavaScriptEncoder.Create(UnicodeRanges.BasicLatin, UnicodeRanges.Latin1Supplement),
            WriteIndented = true,
        });
}
