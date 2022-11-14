using System.Diagnostics.CodeAnalysis;
using System.IO;
using System.Reflection;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Unicode;
using System.Xml;
using System.Xml.Schema;
using Altinn.Studio.DataModeling.Converter.Json.Strategy;
using Altinn.Studio.DataModeling.Converter.Xml;
using Altinn.Studio.DataModeling.Json.Formats;
using Altinn.Studio.DataModeling.Json.Keywords;
using Altinn.Studio.Designer.Factories.ModelFactory;
using Altinn.Studio.Designer.ModelMetadatalModels;
using Designer.Tests.Utils;
using Json.Schema;
using Newtonsoft.Json;
using JsonSerializer = System.Text.Json.JsonSerializer;

namespace Designer.Tests.Factories.ModelFactory.BaseClasses;

/// <summary>
/// Class contains basic methods for loading files and conversion.
/// </summary>
[ExcludeFromCodeCoverage]
public class Xsd2CsharpBaseClass<TTestType> : FluentTestsBase<TTestType>
    where TTestType : Xsd2CsharpBaseClass<TTestType>
{
    public Xsd2CsharpBaseClass()
    {
        JsonSchemaKeywords.RegisterXsdKeywords();
        JsonSchemaFormats.RegisterFormats();
    }

    protected XmlSchema XsdSchema { get; set; }

    protected JsonSchema ConvertedJsonSchema { get; set; }

    protected ModelMetadata ModelMetadata { get; set; }

    protected string CSharpClasses { get; set; }

    protected Assembly CompiledAssembly { get; set; }

    protected Manatee.Json.Schema.JsonSchema JsonSchemaOld { get; set; }

    protected ModelMetadata ModelMetadataOld { get; set; }

    protected string CSharpClassesOld { get; set; }

    protected Assembly CompiledAssemblyOld { get; set; }

    protected TTestType XsdSchemaLoaded(string xsdSchemaPath)
    {
        XsdSchema = TestDataHelper.LoadXmlSchemaTestData(xsdSchemaPath);
        return this as TTestType;
    }

    protected TTestType XsdSchemaConverted2JsonSchema()
    {
        var xsdToJsonConverter = new XmlSchemaToJsonSchemaConverter();
        ConvertedJsonSchema = xsdToJsonConverter.Convert(XsdSchema);
        var schema = JsonSerializer.Serialize(ConvertedJsonSchema, new JsonSerializerOptions()
        {
            Encoder =
                JavaScriptEncoder.Create(UnicodeRanges.BasicLatin, UnicodeRanges.Latin1Supplement),
            WriteIndented = true
        });
        return this as TTestType;
    }

    protected TTestType JsonSchemaConverted2Metamodel()
    {
        var strategy = JsonSchemaConverterStrategyFactory.SelectStrategy(ConvertedJsonSchema);
        var metamodelConverter = new JsonSchemaToMetamodelConverter(strategy.GetAnalyzer());

        var convertedJsonSchemaString = JsonSerializer.Serialize(ConvertedJsonSchema, new JsonSerializerOptions()
        {
            Encoder = JavaScriptEncoder.Create(UnicodeRanges.BasicLatin, UnicodeRanges.Latin1Supplement),
            WriteIndented = true
        });

        ModelMetadata = metamodelConverter.Convert(convertedJsonSchemaString);
        return this as TTestType;
    }

    protected TTestType MetamodelLoaded(string resourceName)
    {
        var assembly = Assembly.GetExecutingAssembly();
        var resource = assembly.GetManifestResourceStream(resourceName);
        using var reader = new StreamReader(resource);
        string metamodelString = reader.ReadToEnd();
        ModelMetadata = JsonConvert.DeserializeObject<ModelMetadata>(metamodelString);
        return this as TTestType;
    }

    protected TTestType CSharpClassesCreatedFromMetamodel()
    {
        CSharpClasses = new JsonMetadataParser().CreateModelFromMetadata(ModelMetadata);
        return this as TTestType;
    }

    protected TTestType XsdSchemaConvertedToJsonSchemaOld(string xsdResource)
    {
        Stream xsdStream = TestDataHelper.LoadTestData(xsdResource);
        XmlReader xmlReader = XmlReader.Create(xsdStream, new XmlReaderSettings { IgnoreWhitespace = true });

        // Compare generated JSON Schema
        var xsdToJsonSchemaConverter = new XsdToJsonSchema(xmlReader);
        JsonSchemaOld = xsdToJsonSchemaConverter.AsJsonSchema();
        return this as TTestType;
    }

    protected TTestType OldJsonSchemaConvertedToMetamodelOld(string org = null, string app = null)
    {
        var converter = new JsonSchemaToInstanceModelGenerator(org, app, JsonSchemaOld);
        ModelMetadataOld = converter.GetModelMetadata();
        return this as TTestType;
    }

    protected TTestType CSharpClassesCreatedFromMetamodelOld()
    {
        CSharpClassesOld = new JsonMetadataParser().CreateModelFromMetadata(ModelMetadataOld);
        return this as TTestType;
    }

    protected TTestType CSharpClassesCompiledToAssembly()
    {
        CompiledAssembly = Compiler.CompileToAssembly(CSharpClasses);
        return this as TTestType;
    }

    protected TTestType CSharpClassesOldCompiledToAssembly()
    {
        CompiledAssemblyOld = Compiler.CompileToAssembly(CSharpClassesOld);
        return this as TTestType;
    }
}
