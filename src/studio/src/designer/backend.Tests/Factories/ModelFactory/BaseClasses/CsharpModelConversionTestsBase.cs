using System.Diagnostics.CodeAnalysis;
using System.Reflection;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Unicode;
using Altinn.Studio.DataModeling.Converter.Json.Strategy;
using Altinn.Studio.Designer.Factories.ModelFactory;
using Altinn.Studio.Designer.ModelMetadatalModels;
using Designer.Tests.Utils;

namespace Designer.Tests.Factories.ModelFactory.BaseClasses;

[ExcludeFromCodeCoverage]
public class CsharpModelConversionTestsBase<TTestType> : SchemasConversionTestsBase<TTestType>
    where TTestType : CsharpModelConversionTestsBase<TTestType>
{
    protected ModelMetadata ModelMetadata { get; set; }

    protected string CSharpClasses { get; set; }

    protected Assembly CompiledAssembly { get; set; }

    protected TTestType JsonSchemaConverted2Metamodel()
    {
        var strategy = JsonSchemaConverterStrategyFactory.SelectStrategy(JsonSchema);
        var metamodelConverter = new JsonSchemaToMetamodelConverter(strategy.GetAnalyzer());

        var jsonSchemaString = JsonSerializer.Serialize(JsonSchema, new JsonSerializerOptions()
        {
            Encoder = JavaScriptEncoder.Create(UnicodeRanges.BasicLatin, UnicodeRanges.Latin1Supplement),
            WriteIndented = true
        });

        ModelMetadata = metamodelConverter.Convert(jsonSchemaString);
        return this as TTestType;
    }

    protected TTestType MetamodelLoaded(string resourceName)
    {
        var metamodelString = TestDataHelper.LoadTestDataFromFileAsString(resourceName);
        ModelMetadata = Newtonsoft.Json.JsonConvert.DeserializeObject<ModelMetadata>(metamodelString);
        return this as TTestType;
    }

    protected TTestType CSharpClassesCreatedFromMetamodel()
    {
        CSharpClasses = new JsonMetadataParser().CreateModelFromMetadata(ModelMetadata);
        return this as TTestType;
    }

    protected TTestType CSharpClassesCompiledToAssembly()
    {
        CompiledAssembly = Compiler.CompileToAssembly(CSharpClasses);
        return this as TTestType;
    }
}
