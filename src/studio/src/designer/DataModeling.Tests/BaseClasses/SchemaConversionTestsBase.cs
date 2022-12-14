using System.Diagnostics.CodeAnalysis;
using System.IO;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Threading.Tasks;
using System.Xml;
using System.Xml.Schema;
using Altinn.Studio.DataModeling.Converter.Json;
using Altinn.Studio.DataModeling.Converter.Xml;
using Altinn.Studio.DataModeling.Json;
using Altinn.Studio.DataModeling.Json.Formats;
using Altinn.Studio.DataModeling.Json.Keywords;
using Json.More;
using Json.Schema;

namespace DataModeling.Tests.BaseClasses;

[ExcludeFromCodeCoverage]
public class SchemaConversionTestsBase<TTestType> : FluentTestsBase<TTestType>
    where TTestType : class
{
    protected XmlSchema LoadedXsdSchema { get; set; }

    protected XmlSchema ConvertedXsdSchema { get; set; }

    protected JsonSchema LoadedJsonSchema { get; set; }

    protected JsonSchema ConvertedJsonSchema { get; set; }

    public SchemaConversionTestsBase()
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

    protected static async Task<string> SerializeJsonSchemaAsync(JsonSchema schema)
    {
        await using var ms = new MemoryStream();
        await using var writer = new Utf8JsonWriter(ms, new JsonWriterOptions { Indented = true, Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping });
        schema.ToJsonDocument().WriteTo(writer);
        await writer.FlushAsync();
        return Encoding.UTF8.GetString(ms.GetBuffer(), 0, (int)ms.Length);
    }
}
