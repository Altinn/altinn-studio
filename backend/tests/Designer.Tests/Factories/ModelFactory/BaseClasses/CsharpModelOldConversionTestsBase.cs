using System.Diagnostics.CodeAnalysis;
using System.IO;
using System.Reflection;
using System.Xml;
using Altinn.Studio.Designer.Factories.ModelFactory;
using Altinn.Studio.Designer.ModelMetadatalModels;
using Designer.Tests.Utils;

namespace Designer.Tests.Factories.ModelFactory.BaseClasses;

[ExcludeFromCodeCoverage]
public class CsharpModelOldConversionTestsBase<TTestType> : CsharpModelConversionTestsBase<TTestType>
    where TTestType : CsharpModelOldConversionTestsBase<TTestType>
{
    protected Manatee.Json.Schema.JsonSchema JsonSchemaOld { get; set; }

    protected ModelMetadata ModelMetadataOld { get; set; }

    protected string CSharpClassesOld { get; set; }

    protected Assembly CompiledAssemblyOld { get; set; }

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

    protected TTestType CSharpClassesOldCompiledToAssembly()
    {
        CompiledAssemblyOld = Compiler.CompileToAssembly(CSharpClassesOld);
        return this as TTestType;
    }
}
